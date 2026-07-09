<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProjectDocumentFileService
{
    private const DATABASE_FILE_BACKUP_MAX_BYTES = 52428800;

    public function storeUploadedFile(UploadedFile $file): array
    {
        $filePath = $file->store('documents', 'public');
        abort_unless($filePath, 500, 'The file could not be saved. Please check storage permissions.');

        $payload = [
            'file_path' => $filePath,
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'file_content' => null,
        ];

        if ($file->getSize() <= self::DATABASE_FILE_BACKUP_MAX_BYTES) {
            $payload['file_content'] = base64_encode(file_get_contents($file->getRealPath()));
        }

        return $payload;
    }

    public function deleteFile(Document $document): void
    {
        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }
    }

    public function fileResponse(Document $document, bool $download)
    {
        abort_unless($document->file_path || $document->file_content, 404);

        $fileName = $this->downloadName($document);

        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            return $download
                ? Storage::disk('public')->download($document->file_path, $fileName, [
                    'Content-Type' => $document->file_type ?: 'application/octet-stream',
                ])
                : Storage::disk('public')->response($document->file_path, $fileName, [
                    'Content-Type' => $document->file_type ?: Storage::disk('public')->mimeType($document->file_path) ?: 'application/octet-stream',
                    'Cache-Control' => 'private, max-age=300',
                ], 'inline');
        }

        abort_unless($document->file_content, 404);

        $content = base64_decode($document->file_content, true);
        abort_unless($content !== false, 404);

        return response($content, 200, [
            'Content-Type' => $document->file_type ?: 'application/octet-stream',
            'Content-Length' => (string) strlen($content),
            'Content-Disposition' => ($download ? 'attachment' : 'inline') . '; filename="' . addslashes($fileName) . '"',
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    private function downloadName(Document $document): string
    {
        $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);
        $title = preg_replace('/[^A-Za-z0-9 _.-]/', '', $document->title ?: 'document-' . $document->id);

        return $extension && ! str_ends_with(strtolower($title), '.' . strtolower($extension))
            ? $title . '.' . $extension
            : $title;
    }
}
