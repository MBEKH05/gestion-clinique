<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('admin123'),
                'is_superuser' => true,
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['username' => 'manager'],
            [
                'name' => 'Manager',
                'password' => Hash::make('manager123'),
                'is_superuser' => false,
                'is_active' => true,
            ]
        );
    }
}
