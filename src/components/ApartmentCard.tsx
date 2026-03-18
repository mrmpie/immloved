'use client';

import { useState } from 'react';
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
} from 'lucide-react';

interface ApartmentCardProps {
  apartment: Apartment;
  isSelected: boolean;
  onSelect: () => void;
  showRestore?: boolean;
}

export default function ApartmentCard({
  apartment,
  isSelected,
  onSelect,
  showRestore = false,
}: ApartmentCardProps) {
  const { updateApartment, removeApartment, restoreApartment } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [editingComment, setEditingComment] = useState<'user1' | 'user2' | null>(null);
  const [commentText, setCommentText] = useState('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressText, setAddressText] = useState(apartment.address || '');

  const apt = apartment;

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
    } else {
      updateApartment(apt.id, {
        [visitedKey]: true,
        [dateKey]: new Date().toISOString().split('T')[0],
      });
    }
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

  return (
    <div
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
          <span className="rounded-full bg-pink-100 px-1.5 py-0.5 text-xs" title="User 1 favorite">
            💖
          </span>
        )}
        {apt.user2_favorite && (
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs" title="User 2 favorite">
            💙
          </span>
        )}
      </div>

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Thumbnail placeholder */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 text-2xl">
            {apt.thumbnail_url ? (
              <img
                src={apt.thumbnail_url}
                alt=""
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              '🏠'
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
                  />
                  <button
                    onClick={handleSaveAddress}
                    className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-white"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <span
                  className="truncate cursor-pointer hover:text-foreground"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingAddress(true);
                  }}
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
                <span className="text-muted-foreground">
                  {formatPricePerM2(apt.price_per_m2)}
                </span>
              )}
              {apt.rooms != null && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Bed className="h-3 w-3" />
                  {apt.rooms} rm
                </span>
              )}
              {apt.area != null && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Ruler className="h-3 w-3" />
                  {apt.area} m²
                </span>
              )}
              {apt.district && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {apt.district}
                </span>
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
                <Star
                  className="h-4 w-4"
                  fill={
                    apt.preference_rating != null && star <= apt.preference_rating
                      ? 'currentColor'
                      : 'none'
                  }
                />
              </button>
            ))}
          </div>

          {/* Visit badges */}
          <div className="flex items-center gap-2">
            {apt.user1_visited && (
              <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                <Check className="h-3 w-3" />
                U1: {apt.user1_visit_date}
              </span>
            )}
            {apt.user2_visited && (
              <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                <Check className="h-3 w-3" />
                U2: {apt.user2_visit_date}
              </span>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div
            className="mt-3 space-y-3 border-t border-border pt-3 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick info grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {apt.type && <Detail label="Type" value={apt.type} />}
              {apt.year_built && <Detail label="Year" value={apt.year_built} />}
              {apt.condition && <Detail label="Condition" value={apt.condition} />}
              {apt.floor && <Detail label="Floor" value={apt.floor} />}
              {apt.heating && <Detail label="Heating" value={apt.heating} />}
              {apt.elevator && <Detail label="Elevator" value={apt.elevator} />}
              {apt.parking && <Detail label="Parking" value={apt.parking} />}
              {apt.rented && <Detail label="Rented" value={apt.rented} />}
              {apt.rental_income && <Detail label="Rental Income" value={apt.rental_income} />}
              {apt.zone_rating && <Detail label="Zone Rating" value={apt.zone_rating} />}
            </div>

            {/* Description */}
            {(apt.description || apt.description_en) && (
              <div>
                <span className="font-semibold text-muted-foreground">Description:</span>
                <p className="mt-0.5 text-muted-foreground leading-relaxed">
                  {truncate(apt.description_en || apt.description, 300)}
                </p>
              </div>
            )}

            {/* Pros & Cons */}
            {apt.pros && (
              <div>
                <span className="font-semibold text-green-600">✅ Pros:</span>
                <p className="mt-0.5 text-muted-foreground">{apt.pros}</p>
              </div>
            )}
            {apt.cons && (
              <div>
                <span className="font-semibold text-red-500">❌ Cons:</span>
                <p className="mt-0.5 text-muted-foreground">{apt.cons}</p>
              </div>
            )}

            {/* User actions */}
            <div className="flex flex-wrap gap-2">
              {/* User 1 controls */}
              <div className="flex-1 min-w-[140px] rounded-lg border border-pink-200 bg-pink-50/50 p-2">
                <div className="mb-1 text-[10px] font-bold text-pink-600">💖 User 1</div>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => handleToggleFavorite('user1')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      apt.user1_favorite
                        ? 'bg-pink-500 text-white'
                        : 'bg-pink-100 text-pink-600'
                    }`}
                  >
                    <Heart className="inline h-3 w-3 mr-0.5" />
                    {apt.user1_favorite ? 'Loved' : 'Love'}
                  </button>
                  <button
                    onClick={() => handleToggleVisit('user1')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      apt.user1_visited
                        ? 'bg-green-500 text-white'
                        : 'bg-green-100 text-green-600'
                    }`}
                  >
                    <Calendar className="inline h-3 w-3 mr-0.5" />
                    {apt.user1_visited ? `Visited ${apt.user1_visit_date || ''}` : 'Mark visited'}
                  </button>
                  <button
                    onClick={() => {
                      setCommentText(apt.user1_comment || '');
                      setEditingComment('user1');
                    }}
                    className="rounded bg-pink-100 px-2 py-0.5 text-[10px] font-medium text-pink-600"
                  >
                    <MessageSquare className="inline h-3 w-3 mr-0.5" />
                    Comment
                  </button>
                </div>
                {apt.user1_comment && !editingComment && (
                  <p className="mt-1 text-[10px] text-pink-700 italic">&ldquo;{apt.user1_comment}&rdquo;</p>
                )}
              </div>

              {/* User 2 controls */}
              <div className="flex-1 min-w-[140px] rounded-lg border border-blue-200 bg-blue-50/50 p-2">
                <div className="mb-1 text-[10px] font-bold text-blue-600">💙 User 2</div>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => handleToggleFavorite('user2')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      apt.user2_favorite
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <Heart className="inline h-3 w-3 mr-0.5" />
                    {apt.user2_favorite ? 'Loved' : 'Love'}
                  </button>
                  <button
                    onClick={() => handleToggleVisit('user2')}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      apt.user2_visited
                        ? 'bg-green-500 text-white'
                        : 'bg-green-100 text-green-600'
                    }`}
                  >
                    <Calendar className="inline h-3 w-3 mr-0.5" />
                    {apt.user2_visited ? `Visited ${apt.user2_visit_date || ''}` : 'Mark visited'}
                  </button>
                  <button
                    onClick={() => {
                      setCommentText(apt.user2_comment || '');
                      setEditingComment('user2');
                    }}
                    className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600"
                  >
                    <MessageSquare className="inline h-3 w-3 mr-0.5" />
                    Comment
                  </button>
                </div>
                {apt.user2_comment && !editingComment && (
                  <p className="mt-1 text-[10px] text-blue-700 italic">&ldquo;{apt.user2_comment}&rdquo;</p>
                )}
              </div>
            </div>

            {/* Comment editor */}
            {editingComment && (
              <div className="rounded-lg border border-border bg-muted/50 p-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={`Comment as ${editingComment === 'user1' ? 'User 1' : 'User 2'}...`}
                  className="w-full rounded border border-border bg-white p-2 text-xs outline-none focus:border-primary"
                  rows={2}
                />
                <div className="mt-1 flex gap-1">
                  <button
                    onClick={() => handleSaveComment(editingComment)}
                    className="rounded bg-primary px-3 py-1 text-[10px] font-medium text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingComment(null)}
                    className="rounded bg-muted px-3 py-1 text-[10px] font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Bottom actions */}
            <div className="flex items-center gap-2 pt-1">
              {apt.url && (
                <a
                  href={apt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded bg-secondary/10 px-2 py-1 text-[10px] font-medium text-secondary hover:bg-secondary/20"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on ImmoScout24
                </a>
              )}
              {showRestore ? (
                <button
                  onClick={() => restoreApartment(apt.id)}
                  className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-200"
                >
                  <Heart className="h-3 w-3" />
                  Restore to Favorites
                </button>
              ) : (
                <button
                  onClick={() => removeApartment(apt.id)}
                  className="flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-100"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
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
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
