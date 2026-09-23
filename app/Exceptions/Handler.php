<?php

namespace App\Exceptions;

use App\Traits\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    use ApiResponse;

    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e): JsonResponse|\Illuminate\Http\Response|\Symfony\Component\HttpFoundation\Response
    {
        // Always return JSON for API routes
        if ($request->is('api/*') || $request->wantsJson()) {
            return $this->handleApiException($e);
        }

        return parent::render($request, $e);
    }

    /**
     * Handle API exceptions and return standardized JSON responses.
     */
    private function handleApiException(Throwable $e): JsonResponse
    {
        if ($e instanceof ValidationException) {
            return $this->validationErrorResponse(
                $e->errors(),
                'Validation failed'
            );
        }

        if ($e instanceof ModelNotFoundException) {
            $model = class_basename($e->getModel());
            return $this->notFoundResponse("{$model} not found");
        }

        if ($e instanceof NotFoundHttpException) {
            return $this->notFoundResponse('Endpoint not found');
        }

        if ($e instanceof AuthenticationException) {
            return $this->unauthorizedResponse('Unauthenticated. Please login first.');
        }

        if ($e instanceof HttpException) {
            return $this->errorResponse(
                $e->getMessage() ?: 'HTTP error',
                $e->getStatusCode()
            );
        }

        // Generic server error
        $message = config('app.debug')
            ? $e->getMessage()
            : 'Server error. Please try again later.';

        return $this->errorResponse($message, 500);
    }
}
