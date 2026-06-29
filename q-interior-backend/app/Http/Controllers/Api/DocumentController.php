<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
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
                    ->orWhere('file_type', 'like', 'image/%')
                    ->orWhere('file_path', 'regexp', '\\.(jpg|jpeg|png|gif|webp|bmp|svg)$');
            });
        }

        if ($request->query('kind') === 'document') {
            $query->where(function ($builder) {
                $builder
                    ->whereNull('document_category')
                    ->orWhere('document_category', '!=', 'Photo');
            })->where(function ($builder) {
                $builder
                    ->whereNull('file_type')
                    ->orWhere('file_type', 'not like', 'image/%');
            })->where(function ($builder) {
                $builder
                    ->whereNull('file_path')
                    ->orWhere('file_path', 'not regexp', '\\.(jpg|jpeg|png|gif|webp|bmp|svg)$');
            });
        }

        return $query->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'title' => 'required|string|max:255',
            'file' => 'nullable|file|max:25600',
            'file_path' => 'nullable|string|max:255',
            'file_type' => 'nullable|string|max:255',
            'document_category' => 'nullable|string|max:255',
            'visibility' => 'nullable|in:internal,client',
            'uploaded_by' => 'nullable|exists:users,id',
        ]);

        if ($request->hasFile('file')) {
            $data['file_path'] = $request->file('file')->store('documents', 'public');
            $data['file_type'] = $request->file('file')->getClientMimeType();
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
            'file' => 'nullable|file|max:25600',
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
            $data['file_path'] = $request->file('file')->store('documents', 'public');
            $data['file_type'] = $request->file('file')->getClientMimeType();
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
        abort_unless($document->file_path && Storage::disk('public')->exists($document->file_path), 404);

        return Storage::disk('public')->download($document->file_path);
    }
}
