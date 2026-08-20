<?php

namespace App\Http\Controllers\Api\Lab;

use App\Http\Controllers\Controller;
use App\Http\Resources\Lab\LabUserResource;
use App\Models\LabDossier;
use App\Models\LabUser;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class LabUserController extends Controller
{
    protected const ROLES = ['technicien', 'medecin', 'secretaire', 'administrateur'];

    public function index()
    {
        return LabUserResource::collection(LabUser::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'username' => 'required|string|max:100|unique:lab_users,username',
            'name' => 'required|string|max:255',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:' . implode(',', self::ROLES),
            'email' => 'sometimes|nullable|email|max:255',
        ]);

        $user = LabUser::create([
            'id' => (string) Str::uuid(),
            'username' => Sanitizer::sanitizeString($data['username'], 100),
            'name' => Sanitizer::sanitizeString($data['name'], 255),
            'email' => Sanitizer::sanitizeString($data['email'] ?? '', 255) ?: null,
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'is_active' => true,
        ]);

        return LabUserResource::make($user)->response()->setStatusCode(201);
    }

    public function update(Request $request, string $id)
    {
        $user = LabUser::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'role' => 'sometimes|string|in:' . implode(',', self::ROLES),
            'email' => 'sometimes|nullable|email|max:255',
            'password' => 'sometimes|nullable|string|min:6',
        ]);

        if (isset($data['name'])) {
            $user->name = Sanitizer::sanitizeString($data['name'], 255);
        }

        if (isset($data['role'])) {
            $user->role = $data['role'];
        }

        if (array_key_exists('email', $data)) {
            $user->email = Sanitizer::sanitizeString($data['email'] ?? '', 255) ?: null;
        }

        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();

        return LabUserResource::make($user);
    }

    public function activate(Request $request, string $id)
    {
        if ($request->user('lab')->id === $id) {
            return response()->json(['detail' => 'Vous ne pouvez pas modifier votre propre statut.'], 409);
        }

        $user = LabUser::findOrFail($id);
        $user->is_active = true;
        $user->save();

        return LabUserResource::make($user);
    }

    public function deactivate(Request $request, string $id)
    {
        if ($request->user('lab')->id === $id) {
            return response()->json(['detail' => 'Vous ne pouvez pas modifier votre propre statut.'], 409);
        }

        $user = LabUser::findOrFail($id);
        $user->is_active = false;
        $user->save();

        return LabUserResource::make($user);
    }

    public function destroy(Request $request, string $id)
    {
        if ($request->user('lab')->id === $id) {
            return response()->json(['detail' => 'Vous ne pouvez pas supprimer votre propre compte.'], 409);
        }

        $user = LabUser::findOrFail($id);

        if (LabDossier::where('technicien_id', $id)->exists()) {
            return response()->json([
                'detail' => 'Ce compte est technicien referent sur des dossiers existants et ne peut pas etre supprime. Desactivez-le a la place.',
            ], 409);
        }

        $user->delete();

        return response()->json(null, 204);
    }
}
