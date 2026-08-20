<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Http\Request;

trait HasLargePagination
{
    protected function pageSize(Request $request, int $default = 5000): int
    {
        $pageSize = (int) $request->query('page_size', $default);

        if ($pageSize <= 0) {
            $pageSize = $default;
        }

        return min($pageSize, 1000000);
    }

    protected function paginatedResponse($query, Request $request, string $resourceClass, int $default = 5000)
    {
        $pageSize = $this->pageSize($request, $default);
        $page = max(1, (int) $request->query('page', 1));

        $paginator = $query->paginate($pageSize, ['*'], 'page', $page);

        return response()->json([
            'count' => $paginator->total(),
            'next' => $paginator->hasMorePages() ? $paginator->currentPage() + 1 : null,
            'previous' => $paginator->currentPage() > 1 ? $paginator->currentPage() - 1 : null,
            'results' => $resourceClass::collection($paginator->items()),
        ]);
    }
}
