<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\LabUser;
use App\Models\LabDossier;
use App\Models\LabDocument;

$roleMap = [
    'technicien' => 'technicien',
    'medecin' => 'medecin',
    'secretaire' => 'secretaire',
    'admin' => 'administrateur',
];

$statutMap = [
    'en_attente_medecin' => 'EN_ATTENTE',
    'valide_final' => 'VALIDE_FINAL',
    'archive' => 'ARCHIVE',
];

$userIdMap = [];
$credentials = [];

echo "=== Migration des utilisateurs labo ===\n";
$users = DB::table('tmp_labo_user')->get();
foreach ($users as $u) {
    $newId = (string) Str::uuid();
    $tempPassword = 'Labo' . random_int(1000, 9999) . '@2025';

    LabUser::create([
        'id' => $newId,
        'username' => $u->username,
        'name' => $u->nom_complet ?: trim($u->first_name . ' ' . $u->last_name) ?: $u->username,
        'email' => $u->email ?: null,
        'password' => $tempPassword,
        'role' => $roleMap[$u->role] ?? 'technicien',
        'is_active' => $u->is_active,
    ]);

    $userIdMap[$u->id] = $newId;
    $credentials[] = "{$u->username} / {$tempPassword} ({$roleMap[$u->role]})";
    echo "  User migre: {$u->username} -> {$newId}\n";
}

echo "\n=== Migration des dossiers labo ===\n";
$dossierIdMap = [];
$dossiers = DB::table('tmp_labo_dossier')->get();
foreach ($dossiers as $d) {
    $newId = (string) Str::uuid();

    LabDossier::create([
        'id' => $newId,
        'patient_nom' => $d->nom_patient,
        'numero_client' => $d->numero_client,
        'patient_telephone' => null,
        'statut' => $statutMap[$d->statut] ?? 'EN_ATTENTE',
        'motif_refus' => $d->commentaire_medecin,
        'technicien_id' => $userIdMap[$d->technicien_id] ?? null,
        'medecin_id' => $d->medecin_id ? ($userIdMap[$d->medecin_id] ?? null) : null,
        'valide_le' => in_array($d->statut, ['valide_final', 'archive']) ? $d->updated_at : null,
        'archive_par_id' => null,
        'archive_le' => $d->statut === 'archive' ? $d->updated_at : null,
    ]);

    $dossierIdMap[$d->id] = $newId;
}
echo "  " . count($dossierIdMap) . " dossiers migres\n";

echo "\n=== Migration des documents PDF ===\n";
$importBase = storage_path('app/public/lab-documents-import');
$docCount = 0;
$missingCount = 0;

foreach ($dossiers as $d) {
    $newDossierId = $dossierIdMap[$d->id];
    $targetDir = storage_path("app/public/lab-documents/{$newDossierId}");
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0775, true);
    }

    // PDF original
    if ($d->pdf_original) {
        $srcPath = $importBase . '/' . str_replace('pdfs/originaux/', 'originaux/', $d->pdf_original);
        if (file_exists($srcPath)) {
            $filename = basename($srcPath);
            $destPath = $targetDir . '/' . $filename;
            copy($srcPath, $destPath);

            LabDocument::create([
                'id' => (string) Str::uuid(),
                'lab_dossier_id' => $newDossierId,
                'nom_original' => $filename,
                'chemin' => "lab-documents/{$newDossierId}/{$filename}",
                'type_mime' => 'application/pdf',
                'taille_octets' => filesize($destPath),
            ]);
            $docCount++;
        } else {
            $missingCount++;
        }
    }

    // PDF signe
    if ($d->pdf_signe) {
        $srcPath = $importBase . '/' . str_replace('pdfs/signes/', 'signes/', $d->pdf_signe);
        if (file_exists($srcPath)) {
            $filename = basename($srcPath);
            $destPath = $targetDir . '/' . $filename;
            copy($srcPath, $destPath);

            LabDocument::create([
                'id' => (string) Str::uuid(),
                'lab_dossier_id' => $newDossierId,
                'nom_original' => $filename,
                'chemin' => "lab-documents/{$newDossierId}/{$filename}",
                'type_mime' => 'application/pdf',
                'taille_octets' => filesize($destPath),
            ]);
            $docCount++;
        } else {
            $missingCount++;
        }
    }
}

echo "  {$docCount} documents migres, {$missingCount} fichiers introuvables\n";

echo "\n=== IDENTIFIANTS GENERES (a communiquer / changer) ===\n";
foreach ($credentials as $c) {
    echo "  {$c}\n";
}

echo "\n=== Migration terminee ===\n";
