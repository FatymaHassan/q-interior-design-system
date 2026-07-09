<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    private const DATABASE_FILE_BACKUP_MAX_BYTES = 52428800;

    public function index(Request $request)
    {
        $query = Document::with(['project', 'uploader']);

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }

        if ($request->query('kind') === 'photo') {
            $query->where(function ($builder) {
                $builder
                    ->where('document_category', 'Photo')
                    ->orWhere(function ($imageBuilder) {
                        $imageBuilder
                            ->where(function ($categoryBuilder) {
                                $categoryBuilder->whereNull('document_category')->orWhere('document_category', 'Other');
                            })
                            ->where(function ($fileBuilder) {
                                $fileBuilder
                                    ->where('file_type', 'like', 'image/%')
                                    ->orWhere('file_path', 'regexp', '\\.(jpg|jpeg|png|gif|webp|bmp|svg)$');
                            });
                    });
            });
        }

        if ($request->query('kind') === 'document') {
            $query->where(function ($builder) {
                $builder
                    ->whereNull('document_category')
                    ->orWhere('document_category', '!=', 'Photo');
            });
        }

        return $query->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'title' => 'required|string|max:255',
            'file' => 'nullable|file|max:204800',
            'file_path' => 'nullable|string|max:255',
            'file_type' => 'nullable|string|max:255',
            'document_category' => 'nullable|string|max:255',
            'visibility' => 'nullable|in:internal,client',
            'uploaded_by' => 'nullable|exists:users,id',
        ]);

        if ($request->hasFile('file')) {
            $data = [...$data, ...$this->storeUploadedFile($request->file('file'))];
        }

        $data['file_path'] = $data['file_path'] ?? '';
        $data['uploaded_by'] = $data['uploaded_by'] ?? $request->user()?->id;
        unset($data['file']);

        $document = Document::create($data);
        Notification::create([
            'project_id' => $document->project_id,
            'title' => 'Project document uploaded',
            'message' => $document->title,
            'type' => 'project_document_uploaded',
            'link' => $document->project_id ? '/projects/' . $document->project_id : '/documents',
            'is_read' => false,
        ]);

        return $document;
    }

    public function show(Document $document)
    {
        return $document->load(['project', 'uploader']);
    }

    public function update(Request $request, Document $document)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'title' => 'sometimes|required|string|max:255',
            'file' => 'nullable|file|max:204800',
            'file_path' => 'nullable|string|max:255',
            'file_type' => 'nullable|string|max:255',
            'document_category' => 'nullable|string|max:255',
            'visibility' => 'nullable|in:internal,client',
            'uploaded_by' => 'nullable|exists:users,id',
        ]);

        if ($request->hasFile('file')) {
            if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
                Storage::disk('public')->delete($document->file_path);
            }
            $data = [...$data, ...$this->storeUploadedFile($request->file('file'))];
        }

        $data['uploaded_by'] = $data['uploaded_by'] ?? $request->user()?->id;
        unset($data['file']);
        $document->update($data);

        return $document;
    }

    public function destroy(Document $document)
    {
        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }

    public function download(Request $request, Document $document)
    {
        return $this->fileResponse($document, true);
    }

    public function preview(Request $request, Document $document)
    {
        return $this->fileResponse($document, false);
    }

    private function storeUploadedFile($file): array
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

    private function fileResponse(Document $document, bool $download)
    {
        abort_unless($document->file_path || $document->file_content, 404);

        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            return $download
                ? Storage::disk('public')->download($document->file_path, $this->downloadName($document), [
                    'Content-Type' => $document->file_type ?: 'application/octet-stream',
                ])
                : Storage::disk('public')->response($document->file_path, $this->downloadName($document), [
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
            'Content-Disposition' => ($download ? 'attachment' : 'inline') . '; filename="' . addslashes($this->downloadName($document)) . '"',
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
