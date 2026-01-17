import { Star } from 'lucide-react';

interface StarRatingProps {
    value: number;
    onChange?: (value: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * StarRating Component
 * Displays and optionally edits a 1-5 star rating
 */
export const StarRating = ({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    const handleClick = (starIndex: number) => {
        if (readonly || !onChange) return;
        onChange(starIndex);
    };

    return (
        <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((starIndex) => (
                <button
                    key={starIndex}
                    type="button"
                    onClick={() => handleClick(starIndex)}
                    disabled={readonly}
                    className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'} focus:outline-none`}
                    aria-label={`${starIndex}つ星`}
                >
                    <Star
                        className={`${sizeClasses[size]} ${starIndex <= value
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                    />
                </button>
            ))}
        </div>
    );
};
