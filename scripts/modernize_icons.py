#!/usr/bin/env python3
"""
Orch-Mind Icon Modernization Script
Generates modern app icons with rounded corners and visual effects for macOS and Windows.

Based on platform guidelines:
- macOS: Rounded corners and effects must be included in the image
- Windows: 48x48 grid with 2px exterior rounded corners, integrated effects
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import os
import sys

class IconModernizer:
    def __init__(self, source_icon_path):
        """Initialize with source icon path."""
        self.source_icon_path = source_icon_path
        self.source_image = Image.open(source_icon_path).convert("RGBA")
        
    def create_rounded_corners(self, image, radius):
        """Apply rounded corners to an image."""
        # Create a mask with rounded corners
        mask = Image.new("L", image.size, 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle((0, 0) + image.size, radius=radius, fill=255)
        
        # Apply the mask
        result = Image.new("RGBA", image.size, (0, 0, 0, 0))
        result.paste(image, (0, 0))
        result.putalpha(mask)
        
        return result
    
    def add_shadow_effect(self, image, shadow_radius=10, shadow_opacity=0.3):
        """Add a subtle shadow effect to the icon."""
        # Create shadow
        shadow = Image.new("RGBA", 
                          (image.size[0] + shadow_radius * 2, 
                           image.size[1] + shadow_radius * 2), 
                          (0, 0, 0, 0))
        
        # Create shadow mask
        shadow_mask = Image.new("L", image.size, 0)
        draw = ImageDraw.Draw(shadow_mask)
        draw.ellipse((0, 0) + image.size, fill=int(255 * shadow_opacity))
        
        # Blur the shadow
        shadow_layer = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
        shadow_layer.paste((0, 0, 0, int(255 * shadow_opacity)), 
                          (shadow_radius, shadow_radius + 2), shadow_mask)
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow_radius // 2))
        
        # Composite shadow with original image
        result = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
        result.paste(shadow_layer, (0, 0))
        result.paste(image, (shadow_radius, shadow_radius), image)
        
        return result
    
    def enhance_colors(self, image, saturation=1.1, brightness=1.05):
        """Enhance colors for modern appearance."""
        # Enhance saturation
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(saturation)
        
        # Slight brightness increase
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(brightness)
        
        return image
    
    def create_macos_icon(self, size=1024):
        """Create macOS-optimized icon with rounded corners and effects."""
        print(f"🍎 Creating macOS icon ({size}x{size})...")
        
        # Resize source image to target size with padding for effects
        padding = size // 16  # ~6% padding as recommended by Apple
        icon_size = size - (padding * 2)
        
        # Resize and enhance the source
        resized = self.source_image.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        enhanced = self.enhance_colors(resized)
        
        # Apply rounded corners (macOS style - about 22% of size)
        corner_radius = int(icon_size * 0.22)
        rounded = self.create_rounded_corners(enhanced, corner_radius)
        
        # Add subtle shadow effect
        with_shadow = self.add_shadow_effect(rounded, shadow_radius=padding//2)
        
        # Center the icon in the final canvas
        final = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        offset = (size - with_shadow.size[0]) // 2
        final.paste(with_shadow, (offset, offset), with_shadow)
        
        return final
    
    def create_windows_icon(self, size=256):
        """Create Windows-optimized icon with grid-aligned rounded corners."""
        print(f"🪟 Creating Windows icon ({size}x{size})...")
        
        # Windows uses a 48x48 grid system, scale accordingly
        grid_ratio = size / 48
        corner_radius = int(2 * grid_ratio)  # 2px at 48x48
        
        # Resize source image
        resized = self.source_image.resize((size, size), Image.Resampling.LANCZOS)
        enhanced = self.enhance_colors(resized, saturation=1.05, brightness=1.02)
        
        # Apply Windows-style rounded corners
        rounded = self.create_rounded_corners(enhanced, corner_radius)
        
        # Add subtle modern effect
        with_shadow = self.add_shadow_effect(rounded, shadow_radius=max(4, size//64))
        
        # Ensure final size matches target
        final = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        if with_shadow.size != (size, size):
            offset = (size - with_shadow.size[0]) // 2
            final.paste(with_shadow, (offset, offset), with_shadow)
        else:
            final = with_shadow
            
        return final
    
    def generate_macos_assets(self, output_dir):
        """Generate all macOS icon assets."""
        print("🍎 Generating macOS assets...")
        
        # macOS icon sizes
        sizes = [
            (1024, "icon-1024x1024.png"),    # App Store, macOS 10.14+
            (512, "icon-512x512.png"),       # macOS 10.14+
            (256, "icon-256x256.png"),       # macOS 10.14+
            (128, "icon-128x128.png"),       # macOS 10.14+
            (64, "icon-64x64.png"),          # macOS 10.14+
            (32, "icon-32x32.png"),          # macOS 10.14+
            (16, "icon-16x16.png"),          # macOS 10.14+
        ]
        
        os.makedirs(output_dir, exist_ok=True)
        
        for size, filename in sizes:
            icon = self.create_macos_icon(size)
            icon_path = os.path.join(output_dir, filename)
            icon.save(icon_path, "PNG")
            print(f"  ✅ Saved {filename}")
        
        return output_dir
    
    def generate_windows_assets(self, output_dir):
        """Generate all Windows icon assets."""
        print("🪟 Generating Windows assets...")
        
        # Windows icon sizes
        sizes = [
            (256, "icon-256x256.png"),
            (128, "icon-128x128.png"),
            (96, "icon-96x96.png"),
            (64, "icon-64x64.png"),
            (48, "icon-48x48.png"),
            (32, "icon-32x32.png"),
            (24, "icon-24x24.png"),
            (16, "icon-16x16.png"),
        ]
        
        os.makedirs(output_dir, exist_ok=True)
        
        for size, filename in sizes:
            icon = self.create_windows_icon(size)
            icon_path = os.path.join(output_dir, filename)
            icon.save(icon_path, "PNG")
            print(f"  ✅ Saved {filename}")
        
        return output_dir

def main():
    """Main script execution."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Paths
    source_icon = os.path.join(project_root, "assets", "icons", "png", "icon-256x256.png")
    output_base = os.path.join(project_root, "assets", "icons")
    
    # Check if source exists
    if not os.path.exists(source_icon):
        print(f"❌ Source icon not found: {source_icon}")
        sys.exit(1)
    
    print("🎨 Orch-Mind Icon Modernization")
    print("=" * 40)
    print(f"📁 Source: {source_icon}")
    print(f"📁 Output: {output_base}")
    print()
    
    # Initialize modernizer
    modernizer = IconModernizer(source_icon)
    
    # Generate macOS assets
    macos_dir = os.path.join(output_base, "mac-modern")
    modernizer.generate_macos_assets(macos_dir)
    print()
    
    # Generate Windows assets
    windows_dir = os.path.join(output_base, "win-modern")
    modernizer.generate_windows_assets(windows_dir)
    print()
    
    print("🎉 Icon modernization complete!")
    print()
    print("📋 Next steps:")
    print("1. Review generated icons in:")
    print(f"   - macOS: {macos_dir}")
    print(f"   - Windows: {windows_dir}")
    print("2. Convert PNG assets to platform formats (.icns, .ico)")
    print("3. Update Electron build configuration")

if __name__ == "__main__":
    main()
