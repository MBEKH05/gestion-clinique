<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\FactureNumero;
use Illuminate\Http\Request;

class FactureMensuelleController extends Controller
{
    public function numero(Request $request)
    {
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
}
