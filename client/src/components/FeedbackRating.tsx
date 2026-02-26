import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}

export function FeedbackRating({ value, onChange, label, disabled = false }: FeedbackRatingProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !disabled && onChange(star)}
            disabled={disabled}
            className={cn(
              "transition-colors",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <Star
              className={cn(
                "h-6 w-6",
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-gray-300"
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {value > 0 ? `${value}/5` : 'Not rated'}
        </span>
      </div>
    </div>
  );
}
