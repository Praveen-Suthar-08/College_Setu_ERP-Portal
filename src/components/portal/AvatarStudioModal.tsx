import React, { useRef, useState } from 'react';
import {
  Check,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  AVATAR_CATEGORIES,
  AvatarCategory,
  BUILT_IN_AVATARS,
  BuiltInAvatarGraphic,
} from '../../data/avatars';
import { Avatar, Button, Input, ModalDialog, StatusLabel } from '../ui/DesignSystem';
import {
  generateImagenAvatarSvgDataUrl,
  getInitialsFromName,
  IMAGEN_STYLE_PRESETS,
  ImagenAvatarStyle,
} from '../../utils/imagenAvatar';

interface AvatarStudioModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userRoleLabel: string;
  currentAvatarId?: string;
  currentCustomUrl?: string;
  onSaveAvatar: (selection: { avatarId?: string; customAvatarUrl?: string }) => void;
}

export const AvatarStudioModal: React.FC<AvatarStudioModalProps> = ({
  open,
  onClose,
  userName,
  userRoleLabel,
  currentAvatarId,
  currentCustomUrl,
  onSaveAvatar,
}) => {
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('All Avatars');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    currentAvatarId || BUILT_IN_AVATARS[0].id
  );
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | undefined>(currentCustomUrl);
  
  // Default to 'imagen' generator mode if user lacks a custom photo or specific built-in avatar ID
  const [mode, setMode] = useState<'imagen' | 'gallery' | 'upload'>(
    currentCustomUrl ? 'upload' : currentAvatarId ? 'gallery' : 'imagen'
  );

  const [customInitials, setCustomInitials] = useState<string>(
    getInitialsFromName(userName)
  );
  const [selectedStyleId, setSelectedStyleId] = useState<ImagenAvatarStyle>('3d_crest');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAvatars =
    activeCategory === 'All Avatars'
      ? BUILT_IN_AVATARS
      : BUILT_IN_AVATARS.filter((item) => item.category === activeCategory);

  const activeImagenDataUrl = generateImagenAvatarSvgDataUrl(userName, {
    customInitials,
    styleId: selectedStyleId,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a valid JPG, PNG, or WebP image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image file size must be under 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomPhotoUrl(reader.result);
        setMode('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (mode === 'imagen') {
      onSaveAvatar({ avatarId: undefined, customAvatarUrl: activeImagenDataUrl });
    } else if (mode === 'upload' && customPhotoUrl) {
      onSaveAvatar({ avatarId: selectedAvatarId, customAvatarUrl: customPhotoUrl });
    } else {
      onSaveAvatar({ avatarId: selectedAvatarId, customAvatarUrl: undefined });
    }
    onClose();
  };

  const selectedBuiltInMeta =
    BUILT_IN_AVATARS.find((a) => a.id === selectedAvatarId) || BUILT_IN_AVATARS[0];

  const activePreviewPhotoUrl =
    mode === 'imagen'
      ? activeImagenDataUrl
      : mode === 'upload'
        ? customPhotoUrl
        : undefined;

  const activePreviewAvatarId = mode === 'gallery' ? selectedAvatarId : undefined;

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      maxWidth="3xl"
      title="Imagen AI Avatar Generator & Studio"
      description="Generate a unique 3D monogram avatar placeholder using your initials as prompt seed, choose a built-in gallery avatar, or upload a custom photo."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Generator, Studio Gallery & Custom Upload */}
        <div className="space-y-4 lg:col-span-8">
          {/* Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="inline-flex rounded-[10px] border border-line bg-paper p-1">
              <button
                type="button"
                onClick={() => setMode('imagen')}
                className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'imagen'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Wand2 className="h-3.5 w-3.5" strokeWidth={1.85} />
                <span>Imagen AI Initials Generator</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('gallery')}
                className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'gallery'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.85} />
                <span>Gallery ({BUILT_IN_AVATARS.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'upload'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Upload className="h-3.5 w-3.5" strokeWidth={1.85} />
                <span>Custom Upload</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setCustomPhotoUrl(undefined);
                setCustomInitials(getInitialsFromName(userName));
                setSelectedStyleId('3d_crest');
                setSelectedAvatarId(BUILT_IN_AVATARS[0].id);
                setMode('imagen');
                setUploadError(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Reset Default</span>
            </button>
          </div>

          {mode === 'imagen' ? (
            <div className="space-y-4 rounded-[12px] border border-line bg-paper/60 p-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h4 className="font-editorial text-sm font-semibold text-ink flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-accent" strokeWidth={2} />
                    <span>Imagen Initials Prompt Seed Generator</span>
                  </h4>
                  <p className="mt-0.5 text-xs text-muted">
                    Generate an exclusive 3D monogram avatar badge seeded from your initials with dynamic metallic lighting and spatial depth.
                  </p>
                </div>
                <StatusLabel tone="accent" label="Imagen AI Engine" />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Initials / Prompt Seed Text"
                  value={customInitials}
                  onChange={(e) => setCustomInitials(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="e.g. JS, AD, CP"
                  hint="Up to 3-4 letters used as monogram prompt seed"
                />
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ink">
                    Style Palette Preset
                  </label>
                  <select
                    value={selectedStyleId}
                    onChange={(e) => setSelectedStyleId(e.target.value as ImagenAvatarStyle)}
                    className="w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-xs font-medium text-ink focus:border-accent focus:outline-none"
                  >
                    {IMAGEN_STYLE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preset Visual Badges Picker */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-medium text-muted">
                  Choose 3D Style Preset Theme
                </label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {IMAGEN_STYLE_PRESETS.map((preset) => {
                    const isSelected = selectedStyleId === preset.id;
                    const previewSvg = generateImagenAvatarSvgDataUrl(userName, {
                      customInitials,
                      styleId: preset.id,
                      size: 64,
                    });
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedStyleId(preset.id)}
                        className={`group flex items-center gap-2.5 rounded-[10px] border p-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-accent bg-accent/10 ring-2 ring-accent/20'
                            : 'border-line bg-paper hover:border-accent/50'
                        }`}
                      >
                        <img
                          src={previewSvg}
                          alt={preset.label}
                          className="h-9 w-9 shrink-0 rounded-full border border-line shadow-xs transition-transform group-hover:scale-105"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-ink">
                            {preset.label}
                          </div>
                          <div className="font-mono text-[10px] text-muted capitalize">
                            {preset.emblemShape} Badge
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : mode === 'gallery' ? (
            <>
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_CATEGORIES.map((cat) => {
                  const active = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`rounded-[8px] border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'border-accent bg-accent/10 text-accent font-semibold'
                          : 'border-line bg-paper text-muted hover:border-accent/50 hover:text-ink'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Avatar Grid */}
              <div className="grid max-h-[320px] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
                {filteredAvatars.map((item) => {
                  const isSelected = selectedAvatarId === item.id && mode === 'gallery';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatarId(item.id);
                        setMode('gallery');
                      }}
                      className={`group relative flex flex-col items-center gap-2 rounded-[10px] border p-3 text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-accent bg-accent/5 ring-2 ring-accent/25'
                          : 'border-line bg-paper/60 hover:border-accent/60 hover:bg-surface'
                      }`}
                    >
                      <div className="relative h-14 w-14 overflow-hidden rounded-full border border-line shadow-xs transition-transform group-hover:scale-105">
                        <BuiltInAvatarGraphic
                          avatarId={item.id}
                          name={userName}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="w-full truncate text-[11px] font-medium text-ink">
                        {item.label}
                      </div>
                      <span className="font-mono text-[10px] text-muted">{item.category}</span>

                      {isSelected && (
                        <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white shadow-xs">
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-4 rounded-[12px] border border-dashed border-line bg-paper/60 p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface text-accent">
                <ImageIcon className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-editorial text-base font-semibold text-ink">
                  Upload Custom Profile Photograph
                </h4>
                <p className="mt-1 text-xs text-muted">
                  Supports JPG, PNG, and WebP formats up to 5 MB. Automatically centered and cropped to a circular institutional badge.
                </p>
              </div>

              {uploadError && (
                <div className="mx-auto max-w-md rounded-[8px] border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {uploadError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Select Image File</span>
                </Button>
                {customPhotoUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setCustomPhotoUrl(undefined);
                      setMode('imagen');
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger" strokeWidth={1.75} />
                    <span>Remove Custom Image</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Multi-Context Avatar Preview */}
        <div className="flex flex-col justify-between rounded-[12px] border border-line bg-paper p-5 lg:col-span-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
                Live Preview
              </span>
              <StatusLabel
                tone="accent"
                label={
                  mode === 'imagen'
                    ? 'Imagen AI Seed'
                    : mode === 'upload' && customPhotoUrl
                      ? 'Custom Photo'
                      : selectedBuiltInMeta.category
                }
              />
            </div>

            {/* Large Profile Header Preview */}
            <div className="flex flex-col items-center rounded-[10px] border border-line bg-surface p-5 text-center">
              <Avatar
                name={userName}
                size="2xl"
                avatarId={activePreviewAvatarId}
                photoUrl={activePreviewPhotoUrl}
              />
              <div className="mt-3 font-editorial text-base font-semibold text-ink">
                {userName}
              </div>
              <div className="mt-0.5 text-xs text-muted">{userRoleLabel}</div>
              <div className="mt-2 font-mono text-[11px] text-accent">
                {mode === 'imagen'
                  ? `Imagen AI Seed: "${customInitials}"`
                  : mode === 'upload' && customPhotoUrl
                    ? 'Custom Uploaded Image'
                    : selectedBuiltInMeta.label}
              </div>
            </div>

            {/* Compact Sidebar & Top Bar Preview */}
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-muted">
                Top Bar & Sidebar Appearance
              </div>
              <div className="flex items-center gap-3 rounded-[10px] border border-line bg-surface p-3">
                <Avatar
                  name={userName}
                  size="sm"
                  avatarId={activePreviewAvatarId}
                  photoUrl={activePreviewPhotoUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-ink">{userName}</div>
                  <div className="truncate font-mono text-[10px] text-muted">{userRoleLabel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleSave}>
              Save Avatar
            </Button>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
};
