<?php

use App\Http\Controllers\Api\Admin\PlatformAuthController;
use App\Http\Controllers\Api\Admin\PlatformDashboardController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AnalyseController;
use App\Http\Controllers\Api\AssuranceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategorieController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DevisController;
use App\Http\Controllers\Api\FactureMensuelleController;
use App\Http\Controllers\Api\IpmController;
use App\Http\Controllers\Api\Lab\LabAuthController;
use App\Http\Controllers\Api\Lab\LabDocumentAnnexeController;
use App\Http\Controllers\Api\Lab\LabDossierController;
use App\Http\Controllers\Api\Lab\LabStatsController;
use App\Http\Controllers\Api\Lab\LabUserController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\StatistiqueController;
use App\Http\Controllers\Api\TarifController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('logout', [AuthController::class, 'logout']);
    Route::post('token/refresh', [AuthController::class, 'refresh']);
    Route::get('check', [AuthController::class, 'check'])->middleware('auth:api');
});

Route::middleware('auth:api')->group(function () {

    Route::apiResource('analyses', AnalyseController::class)->parameters(['analyses' => 'id']);

    Route::apiResource('ipms', IpmController::class)->parameters(['ipms' => 'id']);
    Route::middleware('admin')->group(function () {
        Route::post('ipms/{id}/activate', [IpmController::class, 'activate']);
        Route::post('ipms/{id}/deactivate', [IpmController::class, 'deactivate']);
    });

    Route::apiResource('assurances', AssuranceController::class)->parameters(['assurances' => 'id']);
    Route::middleware('admin')->group(function () {
        Route::post('assurances/{id}/activate', [AssuranceController::class, 'activate']);
        Route::post('assurances/{id}/deactivate', [AssuranceController::class, 'deactivate']);
    });

    Route::apiResource('tarifs', TarifController::class)->parameters(['tarifs' => 'id']);

    Route::get('patients/search', [PatientController::class, 'search']);
    Route::apiResource('patients', PatientController::class)->parameters(['patients' => 'id']);

    Route::get('devis/proforma', [DevisController::class, 'proforma']);
    Route::patch('devis/{id}/update_paiement', [DevisController::class, 'updatePaiement']);
    Route::apiResource('devis', DevisController::class)->parameters(['devis' => 'id'])->except(['destroy']);
    Route::middleware('admin')->delete('devis/{id}', [DevisController::class, 'destroy']);

    Route::get('dashboard-stats', [DashboardController::class, 'stats']);

    Route::get('factures-mensuelles/numero', [FactureMensuelleController::class, 'numero']);

    Route::middleware('admin')->group(function () {
        Route::get('categories', [CategorieController::class, 'index']);
        Route::post('categories', [CategorieController::class, 'store']);
        Route::put('categories/{nom}', [CategorieController::class, 'update']);
        Route::delete('categories/{nom}', [CategorieController::class, 'destroy']);
        Route::post('categories/{nom}/activate', [CategorieController::class, 'activate']);
        Route::post('categories/{nom}/deactivate', [CategorieController::class, 'deactivate']);

        Route::get('statistiques/paiement', [StatistiqueController::class, 'paiement']);
    });
});

Route::prefix('lab')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('login', [LabAuthController::class, 'login']);
        Route::post('logout', [LabAuthController::class, 'logout']);
        Route::post('token/refresh', [LabAuthController::class, 'refresh']);
        Route::get('check', [LabAuthController::class, 'check'])->middleware('auth:lab');
    });

    Route::middleware('auth:lab')->group(function () {
        Route::get('dossiers', [LabDossierController::class, 'index']);
        Route::get('dossiers/{id}', [LabDossierController::class, 'show']);

        Route::middleware('lab.role:technicien')->group(function () {
            Route::post('dossiers', [LabDossierController::class, 'store']);
            Route::delete('dossiers/{dossierId}/documents/{documentId}', [LabDossierController::class, 'destroyDocument']);
            Route::post('dossiers/{id}/confirm', [LabDossierController::class, 'confirm']);
        });

        Route::middleware('lab.role:technicien,administrateur')->group(function () {
            Route::post('dossiers/{id}', [LabDossierController::class, 'update']);
            Route::delete('dossiers/{id}', [LabDossierController::class, 'destroy']);
        });

        Route::middleware('lab.role:medecin')->group(function () {
            Route::post('dossiers/{id}/approve', [LabDossierController::class, 'approve']);
            Route::post('dossiers/{id}/refuse', [LabDossierController::class, 'refuse']);
        });

        Route::middleware('lab.role:secretaire,medecin')->group(function () {
            Route::post('dossiers/{id}/archive', [LabDossierController::class, 'archive']);
        });

        Route::get('documents-annexes', [LabDocumentAnnexeController::class, 'index']);
        Route::middleware('lab.role:technicien,administrateur')->group(function () {
            Route::post('documents-annexes', [LabDocumentAnnexeController::class, 'store']);
            Route::delete('documents-annexes/{id}', [LabDocumentAnnexeController::class, 'destroy']);
        });
        Route::middleware('lab.role:administrateur')->group(function () {
            Route::post('documents-annexes/{id}', [LabDocumentAnnexeController::class, 'update']);
        });

        Route::middleware('lab.role:administrateur')->group(function () {
            Route::get('stats', [LabStatsController::class, 'stats']);
            Route::get('users', [LabUserController::class, 'index']);
            Route::post('users', [LabUserController::class, 'store']);
            Route::put('users/{id}', [LabUserController::class, 'update']);
            Route::post('users/{id}/activate', [LabUserController::class, 'activate']);
            Route::post('users/{id}/deactivate', [LabUserController::class, 'deactivate']);
            Route::delete('users/{id}', [LabUserController::class, 'destroy']);
        });
    });
});

// Espace Administration : compte distinct des espaces Facturation et
// Laboratoire, avec une vue combinee et la gestion de tous les comptes.
Route::prefix('admin')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('login', [PlatformAuthController::class, 'login']);
        Route::post('logout', [PlatformAuthController::class, 'logout']);
        Route::post('token/refresh', [PlatformAuthController::class, 'refresh']);
        Route::get('check', [PlatformAuthController::class, 'check'])->middleware('auth:platform');
    });

    Route::middleware('auth:platform')->group(function () {
        Route::get('dashboard', [PlatformDashboardController::class, 'stats']);

        Route::get('users', [AdminUserController::class, 'index']);
        Route::post('users', [AdminUserController::class, 'store']);
        Route::put('users/{id}', [AdminUserController::class, 'update']);
        Route::post('users/{id}/activate', [AdminUserController::class, 'activate']);
        Route::post('users/{id}/deactivate', [AdminUserController::class, 'deactivate']);

        Route::get('lab-users', [LabUserController::class, 'index']);
        Route::post('lab-users', [LabUserController::class, 'store']);
        Route::put('lab-users/{id}', [LabUserController::class, 'update']);
        Route::post('lab-users/{id}/activate', [LabUserController::class, 'activate']);
        Route::post('lab-users/{id}/deactivate', [LabUserController::class, 'deactivate']);

        Route::get('lab-dossiers', [LabDossierController::class, 'index']);
        Route::get('lab-dossiers/{id}', [LabDossierController::class, 'show']);
    });
});
