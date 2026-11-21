<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\FactureNumero;
use App\Support\VerrouFactures;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FactureMensuelleController extends Controller
{
    public function numero(Request $request)
    {
        if ($refus = self::refusSiVerrouille($request)) {
            return $refus;
        }

        $request->validate([
            'mois' => 'required|integer|min:1|max:12',
            'annee' => 'required|integer|min:2000|max:2100',
            'typePriseEnCharge' => 'required|string|in:IPM,ASSURANCE',
            'entiteId' => 'required|string',
        ]);

        $numero = FactureNumero::generate(
            (int) $request->query('mois'),
            (int) $request->query('annee'),
            (string) $request->query('entiteId')
        );

        return response()->json(['numero' => $numero]);
    }

    /** Etat du verrou pour le compte connecte. */
    public function acces(Request $request)
    {
        $userId = (int) $request->user()->id;

        return response()->json([
            'periodeLibre' => VerrouFactures::periodeLibre(),
            'jourLimite' => VerrouFactures::JOUR_LIMITE,
            'autorise' => VerrouFactures::accesAutorise($userId),
            'secondesRestantes' => VerrouFactures::secondesRestantes($userId),
            'codeConfigure' => VerrouFactures::codeConfigure(),
            'bloqueSecondes' => VerrouFactures::bloqueDepuis($userId),
        ]);
    }

    public function deverrouiller(Request $request)
    {
        $data = $request->validate(['code' => 'required|string|max:10']);
        $user = $request->user();

        if (! VerrouFactures::codeConfigure()) {
            return response()->json(['detail' => "Le code d'acces n'est pas encore configure sur le serveur (php artisan factures:code)."], 409);
        }

        $resultat = VerrouFactures::verifier((int) $user->id, $data['code']);

        if ($resultat['ok']) {
            Log::channel('security')->info("Factures mensuelles deverrouillees par {$user->username} depuis {$request->ip()}");

            return response()->json(['autorise' => true, 'secondesRestantes' => VerrouFactures::DUREE_ACCES_MINUTES * 60]);
        }

        Log::channel('security')->warning("Code factures mensuelles incorrect pour {$user->username} depuis {$request->ip()}");

        if (! empty($resultat['bloqueSecondes'])) {
            $minutes = (int) ceil($resultat['bloqueSecondes'] / 60);

            return response()->json(['detail' => "Trop d'essais. Reessayez dans {$minutes} minute(s).", 'bloqueSecondes' => $resultat['bloqueSecondes']], 429);
        }

        return response()->json(['detail' => "Code incorrect. Il reste {$resultat['essaisRestants']} essai(s).", 'essaisRestants' => $resultat['essaisRestants']], 403);
    }

    public function verrouiller(Request $request)
    {
        VerrouFactures::verrouiller((int) $request->user()->id);

        return response()->json(['autorise' => VerrouFactures::accesAutorise((int) $request->user()->id)]);
    }

    /** Reponse 423 si les factures mensuelles sont verrouillees pour ce compte. */
    public static function refusSiVerrouille(Request $request)
    {
        if (VerrouFactures::accesAutorise($request->user()?->id)) {
            return null;
        }

        return response()->json([
            'detail' => 'Les factures mensuelles sont verrouillees apres le '.VerrouFactures::JOUR_LIMITE.' du mois. Saisissez le code d\'acces.',
            'verrouille' => true,
        ], 423);
    }
}
