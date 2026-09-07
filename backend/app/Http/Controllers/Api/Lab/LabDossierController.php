<?php

namespace App\Http\Controllers\Api\Lab;

use App\Http\Controllers\Api\Concerns\HasLargePagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\Lab\LabDossierResource;
use App\Models\LabDocument;
use App\Models\LabDossier;
use App\Support\DocumentStamper;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LabDossierController extends Controller
{
    use HasLargePagination;

    protected const MODIFIABLE = ['EN_ATTENTE', 'REFUSE'];

    public function index(Request $request)
    {
        $statutParam = $request->query('statut', '');
        $orderColumn = ($statutParam === 'VALIDE_FINAL') ? 'valide_le' : 'created_at';

        $query = LabDossier::with(['technicien', 'medecin', 'archivePar'])
            ->orderBy($orderColumn, 'desc');

        // Un technicien ne voit jamais que ses propres dossiers, quel que
        // soit ce que le client demande. Cette route est aussi reutilisee en
        // lecture seule par l'espace Administration (guard 'platform'), qui
        // n'a pas d'utilisateur 'lab' associe : dans ce cas, pas de filtrage.
        $user = $request->user('lab');
        if ($user && $user->role === 'technicien') {
            $query->where('technicien_id', $user->id);
        }

        $statut = $request->query('statut');
        if ($statut) {
            $statuses = array_values(array_filter(array_map('trim', explode(',', $statut))));
            if (count($statuses) > 1) {
                $query->whereIn('statut', $statuses);
            } elseif (count($statuses) === 1) {
                $query->where('statut', $statuses[0]);
            }
        } elseif ($request->boolean('exclude_archived')) {
            $query->where('statut', '!=', 'ARCHIVE');
        }

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('numero_client', 'like', "%{$search}%")
                    ->orWhere('patient_nom', 'like', "%{$search}%");
            });
        }

        $pageSize = (int) $request->query('page_size', 20);

        return $this->paginatedResponse($query, $request, LabDossierResource::class, $pageSize);
    }

    public function show(string $id)
    {
        $dossier = LabDossier::with(['technicien', 'medecin', 'archivePar', 'documents'])
            ->findOrFail($id);

        return LabDossierResource::make($dossier);
    }

    public function store(Request $request)
    {
        $patientNom = Sanitizer::sanitizeString($request->input('patient_nom', ''), 255);

        if ($patientNom === '') {
            return response()->json(['detail' => 'Le nom du patient est requis.'], 400);
        }

        $request->validate([
            'documents' => 'required|array|min:1',
            'documents.*' => 'file|mimes:pdf,jpg,jpeg,png|max:8192',
        ]);

        $dossier = DB::transaction(function () use ($request, $patientNom) {
            $dossier = LabDossier::create([
                'id' => (string) Str::uuid(),
                'patient_nom' => $patientNom,
                'numero_client' => Sanitizer::sanitizeString($request->input('numero_client', ''), 100),
                'patient_telephone' => Sanitizer::sanitizeString($request->input('patient_telephone', ''), 30) ?: null,
                'statut' => 'EN_ATTENTE',
                'technicien_id' => $request->user('lab')->id,
            ]);

            $this->storeDocuments($dossier, $request);

            return $dossier;
        });

        return LabDossierResource::make($dossier->load(['technicien', 'documents']))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, string $id)
    {
        $dossier = LabDossier::findOrFail($id);
        $isAdmin = $request->user('lab')->role === 'administrateur';

        if (! $isAdmin && $dossier->technicien_id !== $request->user('lab')->id) {
            return response()->json(['detail' => 'Ce dossier ne vous appartient pas.'], 403);
        }

        if (! $isAdmin && ! in_array($dossier->statut, self::MODIFIABLE, true)) {
            return response()->json(['detail' => 'Ce dossier ne peut plus etre modifie.'], 409);
        }

        if ($request->has('patient_nom')) {
            $dossier->patient_nom = Sanitizer::sanitizeString($request->input('patient_nom'), 255);
        }

        if ($request->has('numero_client')) {
            $dossier->numero_client = Sanitizer::sanitizeString($request->input('numero_client'), 100);
        }

        if ($request->has('patient_telephone')) {
            $dossier->patient_telephone = Sanitizer::sanitizeString($request->input('patient_telephone'), 30) ?: null;
        }

        if ($request->hasFile('documents')) {
            $request->validate([
                'documents.*' => 'file|mimes:pdf,jpg,jpeg,png|max:8192',
            ]);
            $this->storeDocuments($dossier, $request);
        }

        if ($dossier->statut === 'REFUSE' && ! $isAdmin) {
            $dossier->statut = 'EN_ATTENTE';
            $dossier->motif_refus = null;
        }

        $dossier->save();

        return LabDossierResource::make($dossier->load(['technicien', 'documents']));
    }

    public function destroy(Request $request, string $id)
    {
        $dossier = LabDossier::findOrFail($id);
        $isAdmin = $request->user('lab')->role === 'administrateur';

        if (! $isAdmin && $dossier->technicien_id !== $request->user('lab')->id) {
            return response()->json(['detail' => 'Ce dossier ne vous appartient pas.'], 403);
        }

        if (! $isAdmin && ! in_array($dossier->statut, self::MODIFIABLE, true)) {
            return response()->json(['detail' => 'Ce dossier ne peut plus etre supprime.'], 409);
        }

        foreach ($dossier->documents as $document) {
            Storage::disk('public')->delete($document->chemin);
        }

        $dossier->delete();

        return response()->json(null, 204);
    }

    public function destroyDocument(string $dossierId, string $documentId)
    {
        $dossier = LabDossier::findOrFail($dossierId);

        if (! in_array($dossier->statut, self::MODIFIABLE, true)) {
            return response()->json(['detail' => 'Ce dossier ne peut plus etre modifie.'], 409);
        }

        $document = LabDocument::where('lab_dossier_id', $dossierId)->findOrFail($documentId);
        Storage::disk('public')->delete($document->chemin);
        $document->delete();

        return response()->json(null, 204);
    }

    public function approve(Request $request, string $id)
    {
        $dossier = LabDossier::findOrFail($id);

        if ($dossier->statut !== 'EN_ATTENTE') {
            return response()->json(['detail' => 'Ce dossier n\'est pas en attente d\'avis.'], 409);
        }

        $dossier->update([
            'statut' => 'VALIDE_MEDECIN',
            'medecin_id' => $request->user('lab')->id,
            'valide_le' => now(),
            'motif_refus' => null,
        ]);

        foreach ($dossier->documents as $document) {
            DocumentStamper::stamp(Storage::disk('public')->path($document->chemin), $document->type_mime);
        }

        return LabDossierResource::make($dossier->load(['technicien', 'medecin', 'documents']));
    }

    public function refuse(Request $request, string $id)
    {
        $dossier = LabDossier::findOrFail($id);

        if ($dossier->statut !== 'EN_ATTENTE') {
            return response()->json(['detail' => 'Ce dossier n\'est pas en attente d\'avis.'], 409);
        }

        $motif = Sanitizer::sanitizeString($request->input('motif', ''), 1000);

        if (mb_strlen($motif) < 5) {
            return response()->json(['detail' => 'Le motif de refus doit contenir au moins 5 caracteres.'], 400);
        }

        $dossier->update([
            'statut' => 'REFUSE',
            'medecin_id' => $request->user('lab')->id,
            'motif_refus' => $motif,
        ]);

        return LabDossierResource::make($dossier->load(['technicien', 'medecin', 'documents']));
    }

    public function confirm(Request $request, string $id)
    {
        $dossier = LabDossier::findOrFail($id);

        if ($dossier->statut !== 'VALIDE_MEDECIN') {
            return response()->json(['detail' => 'Ce dossier n\'est pas valide par un medecin.'], 409);
        }

        $dossier->update(['statut' => 'VALIDE_FINAL']);

        return LabDossierResource::make($dossier->load(['technicien', 'medecin', 'documents']));
    }

    public function archive(Request $request, string $id)
    {
        $dossier = LabDossier::findOrFail($id);

        if ($dossier->statut !== 'VALIDE_FINAL') {
            return response()->json(['detail' => 'Ce dossier n\'est pas pret a etre archive.'], 409);
        }

        $dossier->update([
            'statut' => 'ARCHIVE',
            'archive_par_id' => $request->user('lab')->id,
            'archive_le' => now(),
        ]);

        return LabDossierResource::make($dossier->load(['technicien', 'medecin', 'archivePar', 'documents']));
    }

    protected function storeDocuments(LabDossier $dossier, Request $request): void
    {
        foreach ($request->file('documents', []) as $file) {
            $path = $file->store("lab-documents/{$dossier->id}", 'public');

            LabDocument::create([
                'id' => (string) Str::uuid(),
                'lab_dossier_id' => $dossier->id,
                'nom_original' => $file->getClientOriginalName(),
                'chemin' => $path,
                'type_mime' => $file->getClientMimeType(),
                'taille_octets' => $file->getSize(),
            ]);
        }
    }
}
