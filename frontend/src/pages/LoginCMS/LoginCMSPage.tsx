import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast from "../../components/Toast";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { getUserRoleFromToken } from "../../utils/auth";
import {
    getAllLoginSlides,
    createLoginSlide,
    updateLoginSlide,
    deleteLoginSlide,
    reorderLoginSlides,
} from "../../services/loginCmsApi";
import type { LoginSlide, LoginSlideInput } from "../../types/loginCms";
import "../RoleBoard.css";
import "./LoginCMSPage.css";

const EMPTY_FORM: LoginSlideInput = {
    title: "",
    subtitle: "",
    content: "",
    highlight: "",
    imageUrl: "",
    buttonLabel: "",
    buttonUrl: "",
    sortOrder: 0,
    isActive: true,
};

type ToastState = { message: string; variant: "success" | "error" | "info"; visible: boolean };

const LoginCMSPage = () => {
    const navigate = useNavigate();
    const role = (getUserRoleFromToken() || "").toUpperCase();
    const [slides, setSlides] = useState<LoginSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editingSlide, setEditingSlide] = useState<LoginSlide | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState<LoginSlideInput>(EMPTY_FORM);
    const [deleteCandidate, setDeleteCandidate] = useState<LoginSlide | null>(null);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [reordering, setReordering] = useState(false);
    const [toast, setToast] = useState<ToastState>({ message: "", variant: "info", visible: false });
    const [errors, setErrors] = useState<Partial<Record<keyof LoginSlideInput, string>>>({});
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            showToast("Only image files are allowed.", "error");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast("Image must be under 10 MB.", "error");
            return;
        }
        setUploading(true);
        try {
            const token = localStorage.getItem("token") || "";
            const formData = new FormData();
            formData.append("image", file);
            const res = await fetch("/api/upload/image", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || "Upload failed");
            }
            const result = await res.json();
            updateForm("imageUrl", result.url);
            showToast("Image uploaded.", "success");
        } catch (err: any) {
            showToast(err.message || "Failed to upload image.", "error");
        } finally {
            setUploading(false);
        }
    };

    const showToast = useCallback((message: string, variant: ToastState["variant"] = "info") => {
        setToast({ message, variant, visible: true });
        setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3000);
    }, []);

    useEffect(() => {
        if (role !== "ADMIN") {
            navigate("/dashboard");
            return;
        }
        loadSlides();
    }, []);

    const loadSlides = async () => {
        setLoading(true);
        try {
            const data = await getAllLoginSlides();
            setSlides(data);
        } catch {
            showToast("Failed to load slides.", "error");
        } finally {
            setLoading(false);
        }
    };

    const validateForm = (): boolean => {
        const errs: Partial<Record<keyof LoginSlideInput, string>> = {};
        if (!form.title.trim()) errs.title = "Title is required";
        if (!form.content.trim()) errs.content = "Content is required";
        if (form.buttonUrl && !/^https?:\/\/.+/.test(form.buttonUrl.trim())) {
            errs.buttonUrl = "Button URL must start with http:// or https://";
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            const payload: LoginSlideInput = {
                ...form,
                title: form.title.trim(),
                content: form.content.trim(),
                subtitle: form.subtitle?.trim() || null,
                highlight: form.highlight?.trim() || null,
                imageUrl: form.imageUrl?.trim() || null,
                buttonLabel: form.buttonLabel?.trim() || null,
                buttonUrl: form.buttonUrl?.trim() || null,
                sortOrder: editingSlide ? editingSlide.sortOrder : slides.length,
            };
            if (editingSlide) {
                const updated = await updateLoginSlide(editingSlide.id, payload);
                setSlides((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                showToast("Slide updated successfully.", "success");
            } else {
                const created = await createLoginSlide(payload);
                setSlides((prev) => [...prev, created]);
                showToast("Slide created successfully.", "success");
            }
            closeEditor();
        } catch (err: any) {
            showToast(err.message || "Failed to save slide.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteCandidate) return;
        setDeleting(true);
        try {
            await deleteLoginSlide(deleteCandidate.id);
            setSlides((prev) => prev.filter((s) => s.id !== deleteCandidate.id));
            showToast("Slide deleted.", "success");
        } catch {
            showToast("Failed to delete slide.", "error");
        } finally {
            setDeleting(false);
            setDeleteCandidate(null);
        }
    };

    const handleToggleActive = async (slide: LoginSlide) => {
        try {
            const updated = await updateLoginSlide(slide.id, { isActive: !slide.isActive });
            setSlides((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            showToast(`Slide ${updated.isActive ? "enabled" : "disabled"}.`, "success");
        } catch {
            showToast("Failed to toggle slide status.", "error");
        }
    };

    const openEditor = (slide?: LoginSlide) => {
        if (slide) {
            setEditingSlide(slide);
            setForm({
                title: slide.title,
                subtitle: slide.subtitle || "",
                content: slide.content,
                highlight: slide.highlight || "",
                imageUrl: slide.imageUrl || "",
                buttonLabel: slide.buttonLabel || "",
                buttonUrl: slide.buttonUrl || "",
                sortOrder: slide.sortOrder,
                isActive: slide.isActive,
            });
        } else {
            setEditingSlide(null);
            setForm({ ...EMPTY_FORM, sortOrder: slides.length });
        }
        setIsCreating(true);
        setErrors({});
    };

    const closeEditor = () => {
        setIsCreating(false);
        setEditingSlide(null);
        setForm(EMPTY_FORM);
        setErrors({});
    };

    // Drag-and-drop reorder
    const handleDragStart = (index: number) => {
        dragItem.current = index;
    };
    const handleDragEnter = (index: number) => {
        dragOverItem.current = index;
    };
    const handleDragEnd = async () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            dragItem.current = null;
            dragOverItem.current = null;
            return;
        }
        const reordered = [...slides];
        const dragged = reordered.splice(dragItem.current, 1)[0];
        reordered.splice(dragOverItem.current, 0, dragged);
        const withNewOrder = reordered.map((s, idx) => ({ ...s, sortOrder: idx }));
        setSlides(withNewOrder);
        dragItem.current = null;
        dragOverItem.current = null;

        setReordering(true);
        try {
            await reorderLoginSlides(withNewOrder.map((s) => ({ id: s.id, sortOrder: s.sortOrder })));
            showToast("Slide order saved.", "success");
        } catch {
            showToast("Failed to save new order.", "error");
            loadSlides();
        } finally {
            setReordering(false);
        }
    };

    // Preview slide renderer
    const previewSlide = slides.filter((s) => s.isActive)[previewIndex] || slides[0];

    const updateForm = (field: keyof LoginSlideInput, value: string | boolean | number) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    return (
        <div className="roleboard-container">
            <Sidebar currentPath="/login-cms" onNavigate={(path) => navigate(path)} />
            <div className="roleboard-content">
                <Header title="Login Page CMS" />
                <div className="roleboard-body login-cms-panel">
                    <div className="login-cms-header">
                        <div className="login-cms-header-info">
                            <h2 className="login-cms-title">Login Slider Content</h2>
                            <p className="login-cms-subtitle">Manage the slides shown on the login page. Drag to reorder.</p>
                        </div>
                        <button
                            type="button"
                            className="login-cms-add-btn"
                            onClick={() => openEditor()}
                            disabled={reordering}
                        >
                            + New Slide
                        </button>
                    </div>

                    {loading ? (
                        <div className="login-cms-loading">
                            <div className="login-cms-spinner" />
                            <span>Loading slides...</span>
                        </div>
                    ) : (
                        <div className="login-cms-workspace">
                            {/* Slide List Panel */}
                            <div className="login-cms-list-panel">
                                {slides.length === 0 && (
                                    <div className="login-cms-empty">
                                        <div className="login-cms-empty-icon">📋</div>
                                        <p>No slides yet. Click <strong>New Slide</strong> to add one.</p>
                                    </div>
                                )}
                                {slides.map((slide, idx) => (
                                    <div
                                        key={slide.id}
                                        className={`login-cms-card${!slide.isActive ? " inactive" : ""}`}
                                        draggable
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragEnter={() => handleDragEnter(idx)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => e.preventDefault()}
                                    >
                                        <div className="login-cms-card-drag" aria-label="Drag to reorder">⠿</div>
                                        <div className="login-cms-card-body">
                                            <div className="login-cms-card-top">
                                                <span className="login-cms-card-order">#{idx + 1}</span>
                                                <h4 className="login-cms-card-title">{slide.title}</h4>
                                                <span className={`login-cms-status-badge ${slide.isActive ? "active" : "inactive"}`}>
                                                    {slide.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                            {slide.subtitle && <p className="login-cms-card-subtitle">{slide.subtitle}</p>}
                                            {slide.imageUrl && (
                                                <div className="login-cms-card-thumb">
                                                    <img src={slide.imageUrl} alt="Slide thumbnail" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="login-cms-card-actions">
                                            <button
                                                type="button"
                                                className="login-cms-btn-toggle"
                                                onClick={() => handleToggleActive(slide)}
                                                title={slide.isActive ? "Disable slide" : "Enable slide"}
                                            >
                                                {slide.isActive ? "Disable" : "Enable"}
                                            </button>
                                            <button
                                                type="button"
                                                className="login-cms-btn-edit"
                                                onClick={() => openEditor(slide)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="login-cms-btn-delete"
                                                onClick={() => setDeleteCandidate(slide)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Preview Panel */}
                            <div className="login-cms-preview-panel">
                                <div className="login-cms-preview-header">
                                    <span className="login-cms-preview-label">Preview</span>
                                    {slides.filter((s) => s.isActive).length > 1 && (
                                        <div className="login-cms-preview-nav">
                                            <button type="button" onClick={() => setPreviewIndex((p) => Math.max(0, p - 1))}>‹</button>
                                            <span>{previewIndex + 1} / {slides.filter((s) => s.isActive).length}</span>
                                            <button type="button" onClick={() => setPreviewIndex((p) => Math.min(slides.filter((s) => s.isActive).length - 1, p + 1))}>›</button>
                                        </div>
                                    )}
                                </div>
                                {previewSlide ? (
                                    <div className="login-cms-preview-slide">
                                        {previewSlide.imageUrl && (
                                            <div className="login-cms-preview-img">
                                                <img src={previewSlide.imageUrl} alt="" />
                                            </div>
                                        )}
                                        <h3 className="login-cms-preview-title">{previewSlide.title}</h3>
                                        {previewSlide.subtitle && <p className="login-cms-preview-subtitle">{previewSlide.subtitle}</p>}
                                        <div className="login-cms-preview-content">
                                            {previewSlide.content.split("\n").map((line, i) => (
                                                <p key={i} className="login-cms-preview-line">
                                                    {line && <span className="login-cms-preview-bullet">→</span>}
                                                    {line}
                                                </p>
                                            ))}
                                        </div>
                                        {previewSlide.highlight && (
                                            <p className="login-cms-preview-highlight">{previewSlide.highlight}</p>
                                        )}
                                        {previewSlide.buttonLabel && previewSlide.buttonUrl && (
                                            <a href={previewSlide.buttonUrl} target="_blank" rel="noreferrer" className="login-cms-preview-btn">
                                                {previewSlide.buttonLabel}
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div className="login-cms-preview-empty">No active slides to preview</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Modal */}
            {isCreating && (
                <div className="login-cms-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeEditor()}>
                    <div className="login-cms-modal" role="dialog" aria-modal="true" aria-label={editingSlide ? "Edit Slide" : "New Slide"}>
                        <div className="login-cms-modal-header">
                            <h3>{editingSlide ? "Edit Slide" : "New Slide"}</h3>
                            <button type="button" className="login-cms-modal-close" onClick={closeEditor} aria-label="Close">×</button>
                        </div>
                        <div className="login-cms-modal-body">
                            <div className="login-cms-field">
                                <label htmlFor="cms-title">Title <span className="req">*</span></label>
                                <input id="cms-title" type="text" value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="e.g. UNIQUE PRECISION" className={errors.title ? "field-error-input" : ""} />
                                {errors.title && <span className="login-cms-field-error">{errors.title}</span>}
                            </div>
                            <div className="login-cms-field">
                                <label htmlFor="cms-subtitle">Subtitle</label>
                                <input id="cms-subtitle" type="text" value={form.subtitle || ""} onChange={(e) => updateForm("subtitle", e.target.value)} placeholder="e.g. Our Advanced Manufacturing Solutions" />
                            </div>
                            <div className="login-cms-field">
                                <label htmlFor="cms-content">Content <span className="req">*</span> <span className="login-cms-field-hint">(one bullet per line)</span></label>
                                <textarea
                                    id="cms-content"
                                    value={form.content}
                                    onChange={(e) => updateForm("content", e.target.value)}
                                    placeholder={"FANUC ROBOCUT WIRE EDM MACHINE: ...\nEDM DRILLING MACHINE: ..."}
                                    rows={6}
                                    className={errors.content ? "field-error-input" : ""}
                                />
                                {errors.content && <span className="login-cms-field-error">{errors.content}</span>}
                            </div>
                            <div className="login-cms-field">
                                <label htmlFor="cms-highlight">Highlight Text</label>
                                <input id="cms-highlight" type="text" value={form.highlight || ""} onChange={(e) => updateForm("highlight", e.target.value)} placeholder="e.g. Trusted by 100+ customers" />
                            </div>
                            <div className="login-cms-field">
                                <label>Image <span className="login-cms-field-hint">(drag & drop or click to browse)</span></label>
                                <div
                                    className={`login-cms-dropzone${dragOver ? " drag-over" : ""}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) void handleImageUpload(file); }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImageUpload(file); e.target.value = ""; }}
                                    />
                                    {uploading ? (
                                        <div className="login-cms-dropzone-uploading">
                                            <div className="login-cms-spinner" />
                                            <span>Uploading...</span>
                                        </div>
                                    ) : form.imageUrl ? (
                                        <div className="login-cms-dropzone-preview">
                                            <img src={form.imageUrl} alt="Slide" />
                                            <button type="button" className="login-cms-img-remove" onClick={(e) => { e.stopPropagation(); updateForm("imageUrl", ""); }} title="Remove image">×</button>
                                        </div>
                                    ) : (
                                        <div className="login-cms-dropzone-placeholder">
                                            <span className="login-cms-dropzone-icon">📷</span>
                                            <span>Drop image here or click to browse</span>
                                            <span className="login-cms-dropzone-hint">Any format • Max 10 MB</span>
                                        </div>
                                    )}
                                </div>
                                {errors.imageUrl && <span className="login-cms-field-error">{errors.imageUrl}</span>}
                            </div>
                            <div className="login-cms-field-row">
                                <div className="login-cms-field">
                                    <label htmlFor="cms-btnLabel">Button Label</label>
                                    <input id="cms-btnLabel" type="text" value={form.buttonLabel || ""} onChange={(e) => updateForm("buttonLabel", e.target.value)} placeholder="Learn More" />
                                </div>
                                <div className="login-cms-field">
                                    <label htmlFor="cms-btnUrl">Button URL</label>
                                    <input id="cms-btnUrl" type="url" value={form.buttonUrl || ""} onChange={(e) => updateForm("buttonUrl", e.target.value)} placeholder="https://..." className={errors.buttonUrl ? "field-error-input" : ""} />
                                    {errors.buttonUrl && <span className="login-cms-field-error">{errors.buttonUrl}</span>}
                                </div>
                            </div>
                            <div className="login-cms-field-toggle">
                                <label className="login-cms-toggle-label">
                                    <input type="checkbox" checked={form.isActive} onChange={(e) => updateForm("isActive", e.target.checked)} />
                                    <span>Active (visible on login page)</span>
                                </label>
                            </div>
                        </div>
                        <div className="login-cms-modal-footer">
                            <button type="button" className="login-cms-btn-cancel" onClick={closeEditor} disabled={saving}>Cancel</button>
                            <button type="button" className="login-cms-btn-save" onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : editingSlide ? "Update Slide" : "Create Slide"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteCandidate && (
                <ConfirmDeleteModal
                    title="Delete Slide"
                    message={`Are you sure you want to delete this slide? This cannot be undone.`}
                    details={[{ label: "Slide", value: deleteCandidate.title }]}
                    confirmButtonText={deleting ? "Deleting..." : "Delete Slide"}
                    isProcessing={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteCandidate(null)}
                />
            )}

            <Toast
                message={toast.message}
                visible={toast.visible}
                variant={toast.variant}
                onClose={() => setToast((p) => ({ ...p, visible: false }))}
            />
        </div>
    );
};

export default LoginCMSPage;
