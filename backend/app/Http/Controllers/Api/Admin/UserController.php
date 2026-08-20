<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\UserResource;
use App\Models\User;
use App\Support\Sanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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
}
