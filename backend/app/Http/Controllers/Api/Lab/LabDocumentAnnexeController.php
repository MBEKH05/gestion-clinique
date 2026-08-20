<?php

namespace App\Http\Controllers\Api\Lab;

use App\Http\Controllers\Controller;
use App\Http\Resources\Lab\LabDocumentAnnexeResource;
use App\Models\LabDocumentAnnexe;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LabDocumentAnnexeController extends Controller
{
    public function index()
    {
        return LabDocumentAnnexeResource::collection(
            LabDocumentAnnexe::with('ajoutePar')->orderBy('created_at', 'desc')->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'titre' => 'required|string|max:255',
            'document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:8192',
        ]);

        $file = $request->file('document');
        $path = $file->store('lab-documents-annexes', 'public');

        $document = LabDocumentAnnexe::create([
            'id' => (string) Str::uuid(),
            'titre' => Sanitizer::sanitizeString($request->input('titre'), 255),
            'chemin' => $path,
            'type_mime' => $file->getClientMimeType(),
            'taille_octets' => $file->getSize(),
            'ajoute_par_id' => $request->user('lab')->id,
        ]);

        return LabDocumentAnnexeResource::make($document->load('ajoutePar'))->response()->setStatusCode(201);
    }

    public function update(Request $request, string $id)
    {
        $data = $request->validate([
            'titre' => 'required|string|max:255',
        ]);

        $document = LabDocumentAnnexe::findOrFail($id);
        $document->titre = Sanitizer::sanitizeString($data['titre'], 255);
        $document->save();

        return LabDocumentAnnexeResource::make($document->load('ajoutePar'));
    }

    public function destroy(string $id)
    {
        $document = LabDocumentAnnexe::findOrFail($id);
        Storage::disk('public')->delete($document->chemin);
        $document->delete();

        return response()->json(null, 204);
    }
}
