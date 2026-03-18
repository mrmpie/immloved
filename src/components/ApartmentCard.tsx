'use client';

import { useState, forwardRef } from 'react';
import { Apartment } from '@/lib/types';
import { useStore } from '@/lib/store';
import { formatPrice, formatPricePerM2, truncate } from '@/lib/utils';
import {
  Heart,
  MapPin,
  Bed,
  Ruler,
  Calendar,
  MessageSquare,
  Trash2,
  ExternalLink,
  Star,
  ChevronDown,
  ChevronUp,
  Check,
  Pencil,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';

interface ApartmentCardProps {
  apartment: Apartment;
  isSelected: boolean;
  onSelect: () => void;
  showRestore?: boolean;
}

const ApartmentCard = forwardRef<HTMLDivElement, ApartmentCardProps>(
  function ApartmentCard({ apartment, isSelected, onSelect, showRestore = false }, ref) {
  const { updateApartment, removeApartment, restoreApartment, userName1, userName2 } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [linksExpanded, setLinksExpanded] = useState(false);
  const [imageUrlsExpanded, setImageUrlsExpanded] = useState(false);
  const [editingComment, setEditingComment] = useState<'user1' | 'user2' | null>(null);
  const [commentText, setCommentText] = useState('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressText, setAddressText] = useState(apartment.address || '');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editFieldValue, setEditFieldValue] = useState('');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [editingVisitDate, setEditingVisitDate] = useState<'user1' | 'user2' | null>(null);
  const [visitDateValue, setVisitDateValue] = useState('');

  const apt = apartment;

  // Proxy external images to avoid hotlink blocks
  const proxyUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith('/') || url.startsWith('data:')) return url;
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  };

  // Parse image URLs
  const allImages: string[] = [];
  if (apt.thumbnail_url) allImages.push(apt.thumbnail_url);
  if (apt.other_urls) {
    try {
      const urls = JSON.parse(apt.other_urls);
      if (Array.isArray(urls)) allImages.push(...urls.filter((u: string) => u && typeof u === 'string'));
    } catch {
      apt.other_urls.split(',').forEach((u) => {
        const trimmed = u.trim();
        if (trimmed) allImages.push(trimmed);
      });
    }
  }
  const proxiedImages = allImages.map(proxyUrl);

  const handleSaveComment = (user: 'user1' | 'user2') => {
    const key = user === 'user1' ? 'user1_comment' : 'user2_comment';
    updateApartment(apt.id, { [key]: commentText });
    setEditingComment(null);
  };

  const handleToggleVisit = (user: 'user1' | 'user2') => {
    const visitedKey = user === 'user1' ? 'user1_visited' : 'user2_visited';
    const dateKey = user === 'user1' ? 'user1_visit_date' : 'user2_visit_date';
    const isVisited = user === 'user1' ? apt.user1_visited : apt.user2_visited;
    if (isVisited) {
      updateApartment(apt.id, { [visitedKey]: false, [dateKey]: null });
      if (editingVisitDate === user) setEditingVisitDate(null);
    } else {
      const today = new Date().toISOString().split('T')[0];
      updateApartment(apt.id, {
        [visitedKey]: true,
        [dateKey]: today,
      });
      setVisitDateValue(today);
      setEditingVisitDate(user);
    }
  };

  const handleSaveVisitDate = (user: 'user1' | 'user2') => {
    const dateKey = user === 'user1' ? 'user1_visit_date' : 'user2_visit_date';
    updateApartment(apt.id, { [dateKey]: visitDateValue || null });
    setEditingVisitDate(null);
  };

  const handleToggleFavorite = (user: 'user1' | 'user2') => {
    const key = user === 'user1' ? 'user1_favorite' : 'user2_favorite';
    const current = user === 'user1' ? apt.user1_favorite : apt.user2_favorite;
    updateApartment(apt.id, { [key]: !current });
  };

  const handleRating = (rating: number) => {
    updateApartment(apt.id, {
      preference_rating: apt.preference_rating === rating ? null : rating,
    });
  };

  const handleSaveAddress = () => {
    updateApartment(apt.id, { address: addressText, latitude: null, longitude: null });
    setEditingAddress(false);
  };

  const startEditField = (field: string, value: string | number | null | undefined) => {
    setEditingField(field);
    setEditFieldValue(value != null ? String(value) : '');
  };

  const saveEditField = (field: string) => {
    const numFields = ['price', 'area', 'rooms', 'bedrooms', 'bathrooms'];
    const val = numFields.includes(field) ? (editFieldValue ? parseFloat(editFieldValue) : null) : (editFieldValue || null);
    updateApartment(apt.id, { [field]: val } as Partial<Apartment>);
    setEditingField(null);
  };

  return (
    <div
      ref={ref}
      data-apartment-id={apt.id}
      className={`group relative rounded-xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
          : 'border-border bg-white hover:border-primary/30 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      {/* User marks */}
      <div className="absolute -top-2 -right-2 flex gap-1 z-10">
        {apt.user1_favorite && (
          <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-xs" title={`${userName1} favorite`}>
            💖
          </span>
        )}
        {apt.user2_favorite && (
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs" title={`${userName2} favorite`}>
            💙
          </span>
        )}
      </div>

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 text-2xl overflow-hidden relative">
            {proxiedImages.length > 0 ? (
              <img
                src={proxiedImages[0]}
                alt=""
                className="h-full w-full rounded-lg object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              '🏠'
            )}
            {proxiedImages.length > 1 && (
              <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 py-0.5 text-[8px] text-white font-medium flex items-center gap-0.5">
                <ImageIcon className="h-2.5 w-2.5" />
                {proxiedImages.length}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold leading-tight line-clamp-2">
              {apt.title || apt.title_en || 'Untitled'}
            </h3>

            {/* Address */}
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {editingAddress ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    className="rounded border border-border px-1 py-0.5 text-xs outline-none focus:border-primary"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveAddress()}
                    autoFocus
                  />
                  <button onClick={handleSaveAddress} className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-white">Save</button>
                  <button onClick={() => setEditingAddress(false)} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <span
                  className="truncate cursor-pointer hover:text-foreground"
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingAddress(true); }}
                  title="Double-click to edit address"
                >
                  {apt.address || 'No address'}
                </span>
              )}
            </div>

            {/* Key metrics */}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-primary">{formatPrice(apt.price)}</span>
              {apt.price_per_m2 != null && (
                <span className="text-muted-foreground">{formatPricePerM2(apt.price_per_m2)}</span>
              )}
              {apt.rooms != null && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Bed className="h-3 w-3" />{apt.rooms} rm
                </span>
              )}
              {apt.area != null && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Ruler className="h-3 w-3" />{apt.area} m²
                </span>
              )}
              {apt.district && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{apt.district}</span>
              )}
            </div>
          </div>
        </div>

        {/* Rating stars */}
        <div className="mt-2 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                className={`transition-colors ${
                  apt.preference_rating != null && star <= apt.preference_rating
                    ? 'text-accent'
                    : 'text-muted-foreground/30 hover:text-accent/50'
                }`}
              >
                <Star className="h-4 w-4" fill={apt.preference_rating != null && star <= apt.preference_rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>

          {/* Visit badges */}
          <div className="flex items-center gap-2">
            {apt.user1_visited && (
              <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                <Check className="h-3 w-3" />
                {userName1}: {apt.user1_visit_date}
              </span>
            )}
            {apt.user2_visited && (
              <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                <Check className="h-3 w-3" />
                {userName2}: {apt.user2_visit_date}
              </span>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t border-border pt-3 text-xs" onClick={(e) => e.stopPropagation()}>

            {/* Photo gallery */}
            {proxiedImages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Photos ({proxiedImages.length})
                  </span>
                </div>
                
                <div className="relative">
                  <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                    <img
                      src={proxiedImages[galleryIndex]}
                      alt={`Photo ${galleryIndex + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                    />
                  </div>
                  {proxiedImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setGalleryIndex((i) => (i - 1 + proxiedImages.length) % proxiedImages.length)}
                        className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setGalleryIndex((i) => (i + 1) % proxiedImages.length)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
                        {galleryIndex + 1} / {proxiedImages.length}
                      </div>
                    </>
                  )}
                  {/* Thumbnail strip */}
                  {proxiedImages.length > 1 && (
                    <div className="mt-1.5 flex gap-1 overflow-x-auto pb-1">
                      {proxiedImages.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setGalleryIndex(i)}
                          className={`h-10 w-14 shrink-0 overflow-hidden rounded border-2 ${
                            i === galleryIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Editable info grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <EditableDetail field="title" label="Title" value={apt.title} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="price" label="Price (€)" value={apt.price} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} type="number" />
              <EditableDetail field="area" label="Area (m²)" value={apt.area} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} type="number" />
              <EditableDetail field="rooms" label="Rooms" value={apt.rooms} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} type="number" />
              <EditableDetail field="type" label="Type" value={apt.type} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="year_built" label="Year" value={apt.year_built} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="condition" label="Condition" value={apt.condition} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="floor" label="Floor" value={apt.floor} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="heating" label="Heating" value={apt.heating} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="elevator" label="Elevator" value={apt.elevator} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="parking" label="Parking" value={apt.parking} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="district" label="District" value={apt.district} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="rented" label="Rented" value={apt.rented} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="rental_income" label="Rental Income" value={apt.rental_income} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="zone_rating" label="Zone Rating" value={apt.zone_rating} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
              <EditableDetail field="available_from" label="Available From" value={apt.available_from} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
            </div>

            {/* Editable description */}
            <EditableTextArea field="description" label="Description" value={apt.description} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />

            {/* Editable pros & cons */}
            <EditableTextArea field="pros" label="✅ Pros" value={apt.pros} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} color="green" />
            <EditableTextArea field="cons" label="❌ Cons" value={apt.cons} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} color="red" />

            {/* Editable image URLs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Image URLs
                </span>
                <button
                  onClick={() => setImageUrlsExpanded(!imageUrlsExpanded)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  title={imageUrlsExpanded ? 'Hide image URLs' : 'Show image URLs'}
                >
                  {imageUrlsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
              
              {imageUrlsExpanded && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <EditableTextArea field="thumbnail_url" label="Thumbnail URL" value={apt.thumbnail_url} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
                  <EditableTextArea field="other_urls" label="Other Image URLs (JSON array or comma-separated)" value={apt.other_urls} editing={editingField} editValue={editFieldValue} onStart={startEditField} onSave={saveEditField} onChange={setEditFieldValue} onCancel={() => setEditingField(null)} />
                </div>
              )}
            </div>

            {/* User actions */}
            <div className="flex flex-wrap gap-2">
              {/* User 1 controls */}
              <div className="flex-1 min-w-[140px] rounded-lg border border-pink-200 bg-pink-50/50 p-2">
                <div className="mb-1 text-[10px] font-bold text-pink-600">💖 {userName1}</div>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => handleToggleFavorite('user1')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      apt.user1_favorite ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-600'
                    }`}
                  >
                    <Heart className="inline h-3 w-3 mr-0.5" />
                    {apt.user1_favorite ? 'Loved' : 'Love'}
                  </button>
                  <button
                    onClick={() => handleToggleVisit('user1')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      apt.user1_visited ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'
                    }`}
                  >
                    <Calendar className="inline h-3 w-3 mr-0.5" />
                    {apt.user1_visited ? 'Visited' : 'Mark visited'}
                  </button>
                  {apt.user1_visited && (
                    <button
                      onClick={() => { setVisitDateValue(apt.user1_visit_date || ''); setEditingVisitDate('user1'); }}
                      className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700"
                    >
                      <Pencil className="inline h-2.5 w-2.5 mr-0.5" />
                      {apt.user1_visit_date || 'Set date'}
                    </button>
                  )}
                  <button
                    onClick={() => { setCommentText(apt.user1_comment || ''); setEditingComment('user1'); }}
                    className="rounded bg-pink-100 px-2 py-0.5 text-[10px] font-medium text-pink-600"
                  >
                    <MessageSquare className="inline h-3 w-3 mr-0.5" />Comment
                  </button>
                </div>
                {apt.user1_comment && !editingComment && (
                  <p className="mt-1 text-[10px] text-pink-700 italic">&ldquo;{apt.user1_comment}&rdquo;</p>
                )}
              </div>

              {/* User 2 controls */}
              <div className="flex-1 min-w-[140px] rounded-lg border border-blue-200 bg-blue-50/50 p-2">
                <div className="mb-1 text-[10px] font-bold text-blue-600">💙 {userName2}</div>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => handleToggleFavorite('user2')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      apt.user2_favorite ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <Heart className="inline h-3 w-3 mr-0.5" />
                    {apt.user2_favorite ? 'Loved' : 'Love'}
                  </button>
                  <button
                    onClick={() => handleToggleVisit('user2')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      apt.user2_visited ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'
                    }`}
                  >
                    <Calendar className="inline h-3 w-3 mr-0.5" />
                    {apt.user2_visited ? 'Visited' : 'Mark visited'}
                  </button>
                  {apt.user2_visited && (
                    <button
                      onClick={() => { setVisitDateValue(apt.user2_visit_date || ''); setEditingVisitDate('user2'); }}
                      className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700"
                    >
                      <Pencil className="inline h-2.5 w-2.5 mr-0.5" />
                      {apt.user2_visit_date || 'Set date'}
                    </button>
                  )}
                  <button
                    onClick={() => { setCommentText(apt.user2_comment || ''); setEditingComment('user2'); }}
                    className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600"
                  >
                    <MessageSquare className="inline h-3 w-3 mr-0.5" />Comment
                  </button>
                </div>
                {apt.user2_comment && !editingComment && (
                  <p className="mt-1 text-[10px] text-blue-700 italic">&ldquo;{apt.user2_comment}&rdquo;</p>
                )}
              </div>
            </div>

            {/* Visit date editor */}
            {editingVisitDate && (
              <div className="rounded-lg border border-green-200 bg-green-50/50 p-2">
                <div className="text-[10px] font-medium text-green-700 mb-1">
                  Visit date for {editingVisitDate === 'user1' ? userName1 : userName2}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={visitDateValue}
                    onChange={(e) => setVisitDateValue(e.target.value)}
                    className="rounded border border-green-300 bg-white px-2 py-1 text-xs outline-none focus:border-green-500"
                  />
                  <button
                    onClick={() => handleSaveVisitDate(editingVisitDate)}
                    className="rounded bg-green-500 px-2 py-1 text-[10px] font-medium text-white hover:bg-green-600"
                  >
                    <Save className="inline h-3 w-3 mr-0.5" />Save
                  </button>
                  <button
                    onClick={() => setEditingVisitDate(null)}
                    className="rounded bg-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-300"
                  >
                    <X className="inline h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Comment editor */}
            {editingComment && (
              <div className="rounded-lg border border-border bg-muted/50 p-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={`Comment as ${editingComment === 'user1' ? userName1 : userName2}...`}
                  className="w-full rounded border border-border bg-white p-2 text-xs outline-none focus:border-primary"
                  rows={2}
                />
                <div className="mt-1 flex gap-1">
                  <button onClick={() => handleSaveComment(editingComment)} className="rounded bg-primary px-3 py-1 text-[10px] font-medium text-white">Save</button>
                  <button onClick={() => setEditingComment(null)} className="rounded bg-muted px-3 py-1 text-[10px] font-medium">Cancel</button>
                </div>
              </div>
            )}

            {/* Links and actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Links & Actions
                </span>
                <button
                  onClick={() => setLinksExpanded(!linksExpanded)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  title={linksExpanded ? 'Hide links' : 'Show links'}
                >
                  {linksExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
              
              {linksExpanded && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  {/* Bottom actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {apt.url && (
                      <a href={apt.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded bg-secondary/10 px-2 py-1 text-[10px] font-medium text-secondary hover:bg-secondary/20">
                        <ExternalLink className="h-3 w-3" />View on ImmoScout24
                      </a>
                    )}
                    {showRestore ? (
                      <button onClick={() => restoreApartment(apt.id)} className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-200">
                        <Heart className="h-3 w-3" />Restore to Favorites
                      </button>
                    ) : (
                      <button onClick={() => removeApartment(apt.id)} className="flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-100">
                        <Trash2 className="h-3 w-3" />Remove
                      </button>
                    )}
                  </div>

                  {/* Contact */}
                  {apt.contact_name && (
                    <div className="text-[10px] text-muted-foreground">
                      <span className="font-medium">Contact:</span> {apt.contact_name}
                      {apt.contact_company && ` – ${apt.contact_company}`}
                      {apt.contact_phone && ` | ${apt.contact_phone}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ApartmentCard;

/* Editable inline field */
function EditableDetail({
  field, label, value, editing, editValue, onStart, onSave, onChange, onCancel, type = 'text',
}: {
  field: string; label: string; value: string | number | null | undefined;
  editing: string | null; editValue: string;
  onStart: (f: string, v: string | number | null | undefined) => void;
  onSave: (f: string) => void; onChange: (v: string) => void; onCancel: () => void;
  type?: string;
}) {
  if (editing === field) {
    return (
      <div className="flex items-center gap-1 col-span-1">
        <span className="text-muted-foreground shrink-0">{label}:</span>
        <input
          type={type}
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(field); if (e.key === 'Escape') onCancel(); }}
          className="flex-1 min-w-0 rounded border border-primary px-1 py-0.5 text-xs outline-none"
          autoFocus
        />
        <button onClick={() => onSave(field)} className="text-primary"><Save className="h-3 w-3" /></button>
        <button onClick={onCancel} className="text-muted-foreground"><X className="h-3 w-3" /></button>
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-1 group/edit cursor-pointer" onClick={() => onStart(field, value)}>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value != null ? String(value) : <span className="italic text-muted-foreground/50">—</span>}</span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground/30 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
    </div>
  );
}

/* Editable text area for longer fields */
function EditableTextArea({
  field, label, value, editing, editValue, onStart, onSave, onChange, onCancel, color,
}: {
  field: string; label: string; value: string | null | undefined;
  editing: string | null; editValue: string;
  onStart: (f: string, v: string | number | null | undefined) => void;
  onSave: (f: string) => void; onChange: (v: string) => void; onCancel: () => void;
  color?: string;
}) {
  if (editing === field) {
    return (
      <div>
        <span className="font-semibold text-muted-foreground">{label}:</span>
        <textarea
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 w-full rounded border border-primary p-1.5 text-xs outline-none"
          rows={3}
          autoFocus
        />
        <div className="flex gap-1">
          <button onClick={() => onSave(field)} className="rounded bg-primary px-2 py-0.5 text-[10px] text-white font-medium">Save</button>
          <button onClick={onCancel} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium">Cancel</button>
        </div>
      </div>
    );
  }
  const colorClass = color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-500' : 'text-muted-foreground';
  return (
    <div className="group/edit cursor-pointer" onClick={() => onStart(field, value)}>
      <span className={`font-semibold ${colorClass}`}>{label}:</span>
      <p className="mt-0.5 text-muted-foreground leading-relaxed inline ml-1">
        {value ? truncate(value, 300) : <span className="italic text-muted-foreground/50">Click to add...</span>}
      </p>
      <Pencil className="inline h-2.5 w-2.5 ml-1 text-muted-foreground/30 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
    </div>
  );
}
