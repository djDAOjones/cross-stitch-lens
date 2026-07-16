# Cross-stitch Design App: Combined Requirements Specification

## 1. Purpose

Create an application that converts visual artwork into cross-stitch designs in real time.

The user should be able to create or edit artwork in another application, such as Adobe Photoshop, while the cross-stitch app continuously captures a selected area of the screen and renders a corresponding cross-stitch interpretation.

The application performs two main forms of reduction:

- **Spatial reduction:** converting the source artwork into a fixed stitch grid.
- **Colour reduction:** converting source colours into a selected thread-colour palette.

The app must also export both:

- A clean image version of the processed artwork.
- A practical cross-stitch chart with customisable grid, tick marks, numbering and pattern styling.

---

## 2. Core Workflow

A typical workflow would be:

1. Open or create artwork in Photoshop or another visual application.
2. Define the target cross-stitch grid dimensions.
3. Choose a colour mode or thread palette.
4. Select a screen, window or rectangular capture region.
5. Continue editing the source artwork.
6. View the cross-stitch interpretation update in real time.
7. Adjust resizing, colour reduction, dithering and processing order.
8. Preview the design as pixels, simulated stitches or a chart.
9. Export a clean PNG, styled pattern, PDF chart or project file.

The app should also support static image input without requiring screen capture.

---

## 3. Input Sources

The application should support one or more of the following:

- Screen-region capture
- Application-window capture
- Full-screen capture
- Image-file import
- Drag and drop
- Clipboard paste
- Camera or video input
- Virtual video device input
- Direct integration with another creative application in a later version

For screen capture, the user should be able to:

- Select a screen
- Select a window
- Draw a rectangular capture region
- Reposition the region
- Resize the region
- Lock the region
- Pause and resume capture
- Refresh manually
- Process only when the source changes

---

## 4. Stitch Grid

The output must use explicitly defined stitch-grid dimensions.

Example dimensions:

- 100 × 250 stitches
- 200 × 200 stitches
- Any other custom rectangular or square size

The user should be able to enter:

- Grid width
- Grid height
- Optional locked aspect ratio
- Optional physical dimensions
- Optional fabric count, such as 14-count or 18-count Aida

A provisional technical range is:

- Minimum: 1 × 1
- Maximum: 1024 × 1024

The maximum should be tested against real-time processing performance and practical usefulness.

The app should support:

- Square and rectangular designs
- Empty or transparent cells
- Cropping or fitting the source to the grid
- Stretching, containing or covering the source
- Manual source positioning within the grid
- Optional centre alignment
- Optional padding or fabric borders

---

## 5. Colour Modes

The application should support several colour modes.

### 5.1 Full RGB mode

The output may use unrestricted RGB colours without reducing them to a predefined thread palette.

This is useful for:

- Previewing the source at stitch-grid resolution
- Testing resizing and dithering
- Producing pixel-art output
- Allowing manual thread selection later

### 5.2 Preset palettes

The app should include at least two predefined palettes supplied by the developer.

Palette data may initially be imported from an existing spreadsheet of hexadecimal colour codes.

Each palette entry may include:

- Hex colour
- RGB value
- Thread name
- Thread number
- Manufacturer
- Display category
- Symbol assignment
- Notes

### 5.3 User-defined palettes

Users should be able to:

- Create a palette
- Duplicate a palette
- Rename a palette
- Add colours
- Remove colours
- Edit colours
- Enter hex values
- Select colours visually
- Add thread names and catalogue numbers
- Reorder colours
- Enable or disable individual colours
- Import palettes
- Export palettes
- Merge palettes
- Save palettes as presets

### 5.4 Colour Mode interface

A **Colour Mode** button could open a modal containing:

- Full RGB mode
- Preset palette selection
- User-defined palette selection
- Palette editor
- Palette import and export
- Colour-reduction settings

Changing colour mode or palette should update the rendered output immediately.

---

## 6. Colour Reduction

The app must map source colours to the selected output palette.

Possible colour-distance methods include:

- Euclidean RGB distance
- Linear RGB distance
- HSL or HSV distance
- CIELAB distance
- CIEDE2000
- Perceptual weighted RGB
- Custom channel weighting

Controls may include:

- Colour-matching method
- Luminance weighting
- Saturation weighting
- Hue weighting
- Maximum number of colours
- Force inclusion of selected colours
- Exclude selected colours
- Preserve transparent pixels
- Background or fabric colour
- Merge similar colours
- Minimum colour-use threshold

The app should prioritise either:

- Numerical colour accuracy
- Perceived visual similarity
- Ease of stitching
- Reduced thread count

This may be offered as a selectable optimisation mode.

---

## 7. Real-time Processing Pipeline

The application should process the captured source continuously.

A provisional processing pipeline is:

1. Capture the selected source.
2. Crop to the selected region.
3. Apply optional image adjustments.
4. Resize to the target stitch grid.
5. Apply colour reduction.
6. Apply dithering where enabled.
7. Render the preview.
8. Update colour, stitch and export information.

The exact processing order should be configurable because different orders may produce materially different results.

The app should allow comparison between:

- Dithering before resizing
- Dithering after resizing
- Dithering before colour reduction
- Dithering after colour reduction
- Resizing before image adjustment
- Image adjustment before resizing
- Fixed presets for common processing orders
- Fully custom processing order in an advanced mode

The processing pipeline should be non-destructive and saved in the project file.

---

## 8. Dithering

Dithering is a core feature.

It should help represent:

- Gradients
- Shading
- Intermediate colours
- Fine detail
- Colour transitions unavailable in the selected palette

Possible algorithms include:

- None
- Floyd–Steinberg
- False Floyd–Steinberg
- Jarvis–Judice–Ninke
- Stucki
- Atkinson
- Burkes
- Sierra
- Two-row Sierra
- Sierra Lite
- Ordered Bayer dithering
- Blue-noise dithering
- Random dithering
- Threshold dithering

### 8.1 Dithering controls

A dithering modal or advanced settings panel could include:

- Algorithm
- Strength
- Error-diffusion amount
- Threshold
- Pattern or matrix size
- Serpentine processing
- Noise amount
- Edge preservation
- Luminance weighting
- Colour weighting
- Processing order
- Before-and-after comparison
- Live preview
- Preset selection

Users should be able to disable dithering without losing the current dithering settings.

### 8.2 Dithering presets

Users should be able to:

- Save presets
- Load presets
- Rename presets
- Duplicate presets
- Delete presets
- Import presets
- Export presets
- Restore defaults

---

## 9. Image Adjustments

Potential pre-processing controls include:

- Brightness
- Contrast
- Saturation
- Gamma
- Exposure
- Sharpness
- Blur
- Posterisation
- Black point
- White point
- Hue
- Colour temperature
- Edge enhancement
- Noise reduction
- Transparency handling
- Background-colour selection

These may not all be required for the first version, but the architecture should allow them to be added later.

---

## 10. Real-time Preview

The preview should update quickly enough to support interactive artwork development.

Possible preview modes include:

- Plain coloured pixels
- Enlarged pixel-art view
- Simulated thread crosses
- Grid view
- Colour-symbol chart
- Combined colour and symbol chart
- Grayscale symbol chart
- Fabric preview
- Finished-stitch simulation

Display controls may include:

- Zoom
- Pan
- Fit to window
- Actual-size view
- Show or hide grid lines
- Show major grid divisions
- Show row and column numbers
- Show colour symbols
- Show empty canvas
- Compare source and output
- Split-screen comparison
- Toggle between processing stages
- Freeze preview
- Draft-quality mode
- Full-quality mode

---

## 11. Stitch and Colour Information

The app should calculate:

- Number of colours used
- Total stitch count
- Stitch count per colour
- Percentage of the design occupied by each colour
- Empty or background stitches
- Design width and height
- Estimated physical dimensions
- Estimated thread length per colour
- Estimated skeins required
- Thread or palette references
- Colour usage sorted by count
- Unused palette colours

This information should update when the source or settings change.

---

## 12. File Output

The application must support both clean image output and styled cross-stitch chart output.

A useful interface distinction is:

- **Image Export**
- **Pattern Export**

These have different purposes and should have separate settings.

---

## 13. Clean PNG Export

The user should be able to export the processed design as a clean PNG containing only the final reduced artwork.

Options should include:

- Native stitch-grid resolution, where one stitch equals one pixel
- Enlarged pixel-art export using an integer scale factor
- Custom output dimensions
- Transparent background
- Solid background
- Selected fabric colour
- Nearest-neighbour scaling
- Optional embedded project metadata
- Optional separate palette data
- Export of intermediate processing stages

The clean PNG should not include unless explicitly enabled:

- Grid lines
- Tick marks
- Row or column numbers
- Thread symbols
- Page furniture
- Margins
- Titles or legends

---

## 14. Cross-stitch Pattern Export

The application must also export a practical cross-stitch chart.

The chart may include:

- Coloured stitch cells
- Simulated cross stitches
- Black-and-white stitch symbols
- Combined colour and symbol cells
- Grid lines
- Major grid divisions
- Tick marks
- Row and column numbering
- Design dimensions
- Palette or thread key
- Stitch counts
- Design title
- Page numbering
- Registration marks
- Alignment marks
- Overlap areas for multi-page printing
- Fabric colour
- Notes or instructions

---

## 15. Customisable Grid Styling

Grid styling should be configurable independently from the design.

Controls should include:

- Show or hide grid
- Minor grid-line interval
- Major grid-line interval
- Minor grid-line thickness
- Major grid-line thickness
- Grid-line colour
- Grid opacity
- Outer-border thickness
- Outer-border colour
- Grid above or below stitch colours
- Grid visibility in empty cells
- Dashed or solid grid lines
- Grid line joins
- Major division interval, commonly every 5 or 10 stitches

Grid presets might include:

- No grid
- Fine grid
- Major lines every 5 stitches
- Major lines every 10 stitches
- Traditional cross-stitch chart
- Engineering-style grid
- High-contrast print grid

---

## 16. Customisable Tick Marks

Tick marks should be customisable.

Controls should include:

- Show or hide tick marks
- Tick interval
- Major tick interval
- Minor tick interval
- Tick length
- Tick thickness
- Tick colour
- Tick placement on top, bottom, left or right edges
- Independent control for each edge
- Inward-facing or outward-facing ticks
- Ticks aligned to stitch centres
- Ticks aligned to grid boundaries
- Optional numbering
- Numbering interval
- Numbering start value
- Numbering from 0 or 1
- Numbering direction
- Coordinate origin
- Font
- Font size
- Font weight
- Number orientation
- Number offset from grid
- Major and minor number styling

Possible presets:

- Minimal
- Traditional cross-stitch chart
- Every 10 stitches
- Every 5 stitches
- Engineering-style
- Border ticks only
- Full row and column numbering

---

## 17. Symbols and Pattern Keys

For practical pattern output, each palette colour may be assigned a symbol.

The app should support:

- Automatic symbol assignment
- Manual symbol assignment
- Symbol uniqueness checking
- Symbol font selection
- Symbol size
- Symbol colour
- Symbols over colour
- Symbols without colour
- Black-and-white chart mode
- Palette key with symbol, colour, name and thread number
- Stitch count per symbol

The app should avoid assigning visually similar symbols to adjacent colours where possible.

---

## 18. Chart Layout

The export system should support single-page and multi-page layouts.

Options should include:

- A4
- A3
- Letter
- Custom page size
- Portrait orientation
- Landscape orientation
- Margins
- Scale
- Stitches per centimetre
- Fit to one page
- Fixed stitches per page
- Fixed grid-cell size
- Repeated row and column numbers
- Page overlap
- Alignment marks
- Crop marks
- Registration marks
- Page coordinates
- Repeated palette key on every page
- Palette key only once
- Cover page
- Overview page
- High-resolution print output
- Printer-safe margins
- Optional bleed

---

## 19. Output Formats

Initial formats should include:

- Clean PNG
- Styled PNG chart
- PDF cross-stitch plan
- SVG chart
- CSV stitch data
- JSON project file

Possible later formats:

- TIFF
- WebP
- Spreadsheet-based stitch plan
- Machine-readable embroidery formats where relevant
- Palette-only export
- Dithering-preset export
- Print-ready ZIP package containing all project outputs

---

## 20. Project Files and Presets

A full project file should preserve:

- Grid dimensions
- Source type
- Source capture settings
- Source image reference
- Selected palette
- Custom palette data
- Colour-reduction method
- Dithering algorithm
- Dithering parameters
- Processing order
- Image adjustments
- Preview settings
- Grid styling
- Tick-mark styling
- Symbol assignments
- Chart layout
- Export preferences

JSON is suitable for a human-readable project format.

Separate import and export should also be available for:

- Palettes
- Dithering presets
- Processing presets
- Export presets
- Full projects

---

## 21. Export Presets

An export preset might contain:

- Output format
- Resolution
- Scale factor
- Background treatment
- Grid styling
- Tick-mark styling
- Numbering
- Symbols
- Page size
- Orientation
- Margins
- Multi-page layout
- Thread-key placement

Example presets:

- Clean transparent PNG
- Pixel-art PNG
- A4 colour chart
- A4 black-and-white symbol chart
- Large-format studio chart
- Multi-page printable pattern

---

## 22. Performance Requirements

Real-time performance is important.

The app should aim to:

- Capture the selected source continuously
- Process with minimal visible delay
- Keep the interface responsive
- Update while artwork is edited
- Avoid unnecessary processing of unchanged frames
- Reduce preview quality or frequency when required
- Perform full-quality processing for export
- Use background processing
- Use GPU acceleration where beneficial
- Use multi-threaded CPU processing where beneficial

Potential performance controls:

- Target update rate
- Automatic performance mode
- Draft preview
- Full-quality preview
- Pause processing
- Manual refresh
- Process only on source change
- Reduced-resolution live preview
- Full-resolution final render

The app may not require conventional video frame rates. Several updates per second may be sufficient if the experience feels responsive.

---

## 23. Possible Technical Approaches

### 23.1 Web-based application

Possible technologies:

- HTML
- CSS
- TypeScript
- Canvas
- WebGL
- WebGPU
- WebAssembly
- Web Workers
- Screen Capture API
- IndexedDB

Advantages:

- Faster interface development
- Cross-platform
- Easy project sharing
- Modern browser GPU support
- Can later be packaged as a desktop app

Concerns:

- Screen-capture permissions
- Limited arbitrary-region capture
- Browser-specific performance
- Limited operating-system integration
- Some algorithms may require WebAssembly or GPU implementation

A web app should not automatically be assumed to be too slow. Modern browser graphics and background-processing technologies may be sufficient.

### 23.2 Packaged web desktop application

Possible frameworks:

- Tauri
- Electron
- Other desktop webview frameworks

Advantages:

- Web-style interface development
- Better local file access
- Better desktop integration
- Conventional application packaging
- Native processing modules can be added
- Tauri can combine a web front end with Rust processing

Concerns:

- Electron can be large and memory intensive
- Tauri requires some native-development knowledge
- Screen capture remains platform-specific

### 23.3 Native desktop application

Possible technologies:

- Swift and SwiftUI for macOS
- C++ and Qt
- Rust desktop frameworks
- C# and .NET

Advantages:

- Strong performance
- Better OS and GPU access
- Better control of screen capture
- Suitable for a polished product

Concerns:

- Greater development complexity
- Harder cross-platform support
- Slower interface development
- Deeper programming requirements

### 23.4 Max/MSP and Jitter

Advantages:

- Good for rapid visual-media prototyping
- Familiar real-time processing environment
- Matrix-based image processing
- Potential GPU processing through Jitter and OpenGL
- Useful for testing dithering and processing order

Concerns:

- Conventional interface development may be awkward
- Palette and project management may become cumbersome
- Distribution may be less straightforward
- Some algorithms may require Gen, shaders, JavaScript or externals
- Long-term maintainability may be weaker

Max/MSP may be useful for prototyping even if it is not used for the final application.

### 23.5 Hybrid architecture

A hybrid design could use:

- Web or Tauri interface
- Rust, C++, WebAssembly or GPU processing engine
- Native screen-capture component
- JSON-based communication between components

This may provide a good balance between interface development and processing performance.

---

## 24. Initial Technical Recommendation

The strongest initial direction is a TypeScript prototype, with the option to package it as a desktop application.

A practical starting stack could be:

- TypeScript
- Lightweight web interface framework
- HTML Canvas for the first prototype
- Web Workers for background processing
- WebAssembly or WebGPU if profiling shows a need
- Tauri if native screen capture and local integration are required

Max/MSP could be used separately to prototype:

- Dithering methods
- Processing order
- Real-time capture
- GPU-based image effects

The final technology choice should be based on a small performance prototype rather than assumptions.

---

## 25. Minimum Viable Product

The first functional version should focus on the core processing and export loop.

### Essential MVP features

- Load an image file
- Enter custom grid width and height
- Select full RGB or one preset palette
- Resize the image to the stitch grid
- Apply nearest-colour palette reduction
- Enable or disable Floyd–Steinberg dithering
- Compare at least two processing orders
- Display the resulting pixel grid
- Show colour and stitch counts
- Export a clean PNG at native grid resolution
- Export an enlarged PNG with nearest-neighbour scaling
- Export a styled PNG chart
- Show or hide the grid
- Set a major grid interval
- Configure basic tick marks
- Add row and column numbering
- Export a basic PDF chart
- Save and load the project as JSON

### Second-stage features

- Real-time screen or window capture
- Multiple dithering algorithms
- User-defined palettes
- Palette import and export
- Dithering presets
- Processing-order controls
- Cross-stitch symbols
- Advanced grid styling
- Advanced tick-mark styling
- Multi-page PDF charts
- Physical-size calculations
- Thread-use estimates

### Later features

- Full GPU acceleration
- Advanced image adjustments
- Fabric simulation
- Manufacturer thread databases
- Automatic symbol assignment
- Photoshop integration
- Cross-platform packaged desktop application
- Machine-readable embroidery formats
- Collaborative or cloud project sharing

---

## 26. Key Questions to Resolve

1. Is the primary target macOS, Windows or both?
2. Must the app capture an arbitrary rectangle, or is full-window capture sufficient?
3. What update rate qualifies as real time?
4. Should resizing occur before or after dithering?
5. Should palette reduction occur before or after dithering?
6. Should users be able to create a fully custom processing order?
7. Which thread systems or palettes must be supported?
8. Does each palette contain only hex codes, or also thread names and reference numbers?
9. How should transparency be treated?
10. Must the output be a formally printable cross-stitch chart?
11. Is the app for personal use or wider distribution?
12. Must it work fully offline?
13. Is project-version compatibility important?
14. What maximum grid size is practically useful?
15. Should unchanged source frames be detected?
16. Should colour matching favour accuracy, perception or ease of stitching?
17. Should chart coordinates begin at 0 or 1?
18. Should tick marks align to cell centres or grid boundaries?
19. Which chart-export features are essential for the first usable version?
20. Is clean PNG output always one stitch per pixel, or should other defaults be supported?
