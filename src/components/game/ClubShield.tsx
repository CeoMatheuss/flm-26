import { ShieldCrest } from './ShieldCrest';
import { shieldPropsFromClub, ShieldSourceLike } from './shieldHelpers';
import { cn } from '@/lib/utils';
import { Shield } from 'lucide-react';

interface ClubShieldProps {
  club: ShieldSourceLike | null | undefined;
  size?: number;
  className?: string;
  fallbackText?: string;
}

/**
 * Modern, unified component to render a club's shield.
 * Handles ShieldCrest (V2), Custom Logo (img), and beautiful fallbacks.
 * Replaces the generic football ball icon.
 */
export function ClubShield({ club, size = 32, className, fallbackText }: ClubShieldProps) {
  // If we have a V2 shield configuration or legacy shield fields
  const hasRenderableShield = !!(club?.shield_config?.pattern || club?.shieldConfig?.pattern || club?.shieldPattern);
  
  // Custom logo URL (must be a valid URL, not a string like "solid")
  const logoUrl = club?.shield_config?.logoUrl || club?.shieldConfig?.logoUrl || club?.logoUrl || club?.logo_url;
  const FORBIDDEN_PATTERN_NAMES = ['solid', 'outline', 'stripes', 'halves', 'diagonal', 'split', 'chevron', 'cross', 'waves', 'quarters', 'triband', 'sash', 'hoop'];
  const isRealUrl = logoUrl && 
    (logoUrl.startsWith('http') || logoUrl.startsWith('data:') || logoUrl.startsWith('/')) &&
    !FORBIDDEN_PATTERN_NAMES.includes(logoUrl.toLowerCase());

  if (hasRenderableShield) {
    return (
      <ShieldCrest 
        {...shieldPropsFromClub(club)} 
        size={size} 
        className={cn("shrink-0", className)} 
      />
    );
  }

  if (isRealUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={fallbackText || "Shield"} 
        className={cn("rounded-md object-cover shrink-0", className)}
        style={{ width: size, height: size }}
        onError={(e) => {
          // If image fails, hide it to show fallback or use a placeholder
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // Final Fallback: Modern Shield Icon (not a football)
  const primaryColor = club?.primaryColor || '#444';
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center rounded-lg border border-white/10 bg-muted/20 shrink-0 shadow-inner",
        className
      )}
      style={{ 
        width: size, 
        height: size,
        backgroundColor: `${primaryColor}20`,
        borderColor: `${primaryColor}40`
      }}
    >
      <Shield 
        className="text-muted-foreground/60" 
        style={{ width: size * 0.6, height: size * 0.6, color: primaryColor }}
      />
    </div>
  );
}
