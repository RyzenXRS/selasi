<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    use ApiResponse;

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated. Please login first.',
            ], 401);
        }

        $userRole = strtoupper((string) $request->user()->role);
        
        $roleMap = [
            'CULTIVATOR'  => ['CULTIVATOR', 'PEMBUDIDAYA'],
            'PEMBUDIDAYA' => ['CULTIVATOR', 'PEMBUDIDAYA'],
            'BUYER'       => ['BUYER', 'PEMBELI'],
            'PEMBELI'     => ['BUYER', 'PEMBELI'],
        ];

        $allowed = false;
        foreach ($roles as $role) {
            $normalized = strtoupper($role);
            $mapped = $roleMap[$normalized] ?? [$normalized];
            if (in_array($userRole, $mapped, true)) {
                $allowed = true;
                break;
            }
        }

        if (!$allowed) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. You do not have permission to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}
