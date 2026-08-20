<?php

namespace App\Models\Concerns;

trait AutoSetsCreationTimestamp
{
    public static function bootAutoSetsCreationTimestamp(): void
    {
        static::creating(function ($model) {
            $column = $model->creationTimestampColumn ?? 'created_at';

            if (empty($model->{$column})) {
                $model->{$column} = now();
            }
        });
    }
}
