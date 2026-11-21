<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\UserResource;
use App\Models\User;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    public function index()
    {
        return UserResource::collection(User::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'username' => 'required|string|max:255|unique:users,username',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'is_superuser' => 'boolean',
        ]);

        $user = User::create([
            'username' => Sanitizer::sanitizeString($data['username'], 255),
            'name' => Sanitizer::sanitizeString($data['name'], 255),
            'email' => $data['email'] ?? null,
            'password' => Hash::make($data['password']),
            'is_superuser' => (bool) ($data['is_superuser'] ?? false),
            'is_active' => true,
        ]);

        return UserResource::make($user)->response()->setStatusCode(201);
    }

    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|nullable|email|max:255|unique:users,email,' . $user->id,
            'is_superuser' => 'sometimes|boolean',
            'password' => 'sometimes|nullable|string|min:6',
        ]);

        if (isset($data['name'])) {
            $user->name = Sanitizer::sanitizeString($data['name'], 255);
        }

        if (array_key_exists('email', $data)) {
            $user->email = $data['email'];
        }

        if (isset($data['is_superuser'])) {
            $user->is_superuser = $data['is_superuser'];
        }

        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();

        return UserResource::make($user);
    }

    public function activate(string $id)
    {
        $user = User::findOrFail($id);
        $user->is_active = true;
        $user->save();

        return UserResource::make($user);
    }

    public function deactivate(string $id)
    {
        $user = User::findOrFail($id);
        $user->is_active = false;
        $user->save();

        return UserResource::make($user);
    }

    /**
     * Supprime un compte Facturation. Les patients, devis et rendez-vous qu'il a
     * crees sont conserves (ils ne sont simplement plus attribues a ce compte) :
     * dans ce cas une confirmation explicite (confirmer=1) est demandee.
     */
    public function destroy(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        if ($user->is_superuser && ! User::where('is_superuser', true)->where('is_active', true)->whereKeyNot($user->id)->exists()) {
            return response()->json(['detail' => 'Impossible de supprimer le dernier compte Super Admin actif.'], 409);
        }

        $activite = [
            'patients' => DB::table('patients')->where('created_by', $user->id)->count(),
            'devis' => DB::table('devis')->where('created_by', $user->id)->count(),
            'rendezVous' => DB::table('rendez_vous')->where('created_by', $user->id)->count(),
        ];

        if (array_sum($activite) > 0 && ! $request->boolean('confirmer')) {
            return response()->json([
                'detail' => "Ce compte a enregistre {$activite['patients']} patient(s), {$activite['devis']} devis et {$activite['rendezVous']} rendez-vous. "
                    ."Ils seront conserves mais n'apparaitront plus dans son rapport d'activite.",
                'confirmation_requise' => true,
                'activite' => $activite,
            ], 409);
        }

        Log::channel('security')->warning("Compte facturation supprime : {$user->username} (id {$user->id}) par l'administrateur de la plateforme", $activite);
        $user->delete();

        return response()->json(null, 204);
    }
}
