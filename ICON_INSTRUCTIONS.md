# Icon Instructions

The extension requires an icon file at `icons/icon.png`.

## Quick Solution

### Option 1: Create a Simple Icon
1. Create a 128x128 PNG image with a blue background
2. Add text "JT" (for Jira Timesheet) in white
3. Save as `icons/icon.png`

### Option 2: Use an Online Tool
1. Visit https://www.favicon-generator.org/ or similar
2. Upload any image or create a simple design
3. Download the PNG file
4. Rename to `icon.png` and place in the `icons/` folder

### Option 3: Use a Placeholder
1. Find any PNG image on your computer
2. Copy it to `icons/icon.png`
3. The extension will work with any PNG file

## Recommended Specifications

- Format: PNG
- Size: 128x128 pixels (will be scaled down automatically)
- Background: Solid color or transparent
- Design: Simple and recognizable

## Example Using Command Line (if you have ImageMagick)

```bash
# Create a simple blue icon with white text
convert -size 128x128 xc:#0052cc -gravity center -pointsize 48 -fill white -annotate +0+0 "JT" icons/icon.png
```

## Note

The extension will NOT load without an icon file. Make sure to add one before loading the extension in Chrome.
