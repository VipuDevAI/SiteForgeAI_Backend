import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface WebsiteGenerationRequest {
  businessName: string;
  businessType: string;
  description: string;
  primaryColor?: string;
  sections?: string[];
}

export interface GeneratedWebsite {
  html: string;
  css: string;
}

const WEBSITE_SYSTEM_PROMPT = `You are an elite web designer at a top creative agency. Generate STUNNING, award-winning websites that look like they cost $10,000+ to build.

DESIGN PRINCIPLES:
1. VISUAL HIERARCHY - Use size, color, and spacing to guide the eye
2. WHITESPACE - Generous padding and margins for premium feel (80px+ section padding)
3. TYPOGRAPHY - Use Inter or Poppins from Google Fonts with proper sizing (48-72px for hero headlines)
4. COLOR GRADIENTS - Subtle gradients for backgrounds and buttons (primary to slightly darker shade)
5. SHADOWS - Soft, layered shadows for depth (0 25px 50px -12px rgba(0,0,0,0.15))
6. ANIMATIONS - Smooth CSS transitions on hover (transform, box-shadow changes)
7. IMAGERY - Use beautiful placeholder images from unsplash.com (real URLs)
8. ICONS - Use Font Awesome 6 or Lucide-style SVG icons

REQUIRED TECHNICAL SPECS:
- Include Google Fonts link in <head>
- Include Font Awesome CDN for icons
- Full viewport hero section (min-height: 100vh)
- CSS Grid or Flexbox for all layouts
- Smooth scroll behavior (scroll-behavior: smooth)
- Mobile responsive with media queries (@media max-width: 768px)
- Glassmorphism effects where appropriate (backdrop-filter: blur)
- Gradient overlays on hero images
- Hover transform effects (scale: 1.02, translateY: -5px)
- Box shadows that lift on hover
- Border-radius on cards (16-24px for premium look)
- Testimonial cards with avatar images and quote styling

STRUCTURE MUST INCLUDE:
- Fixed/sticky navigation with backdrop blur
- Full-screen hero with gradient overlay, compelling headline, subtext, and 2 CTAs
- Animated stats/numbers section
- Features/services in modern card grid
- About section with image and text side-by-side
- Testimonials as cards or carousel-style
- Pricing tables with popular plan highlighted
- Contact section with styled form
- Footer with multiple columns, social links, newsletter signup

COLOR USAGE:
- Primary color for CTAs, accents, highlights
- Dark navy/charcoal for text (#1a1a2e or similar)
- Light gray backgrounds (#f8fafc) for alternating sections
- White cards on gray backgrounds
- Gradient buttons (primary color gradient)

OUTPUT FORMAT:
Return a JSON object with exactly two keys:
- "html": Complete HTML5 document with <!DOCTYPE html>, proper <head> with all CDN links, and full <body>
- "css": Complete CSS in the <style> tag within the HTML (inline it properly)

CRITICAL: Embed ALL CSS inside a <style> tag in the <head>. The "css" field can be empty or contain additional styles.

Do NOT include markdown. Return ONLY the JSON object.`;

export async function generateWebsite(request: WebsiteGenerationRequest): Promise<GeneratedWebsite> {
  const sections = request.sections || ["hero", "features", "about", "testimonials", "pricing", "contact", "footer"];
  const primaryColor = request.primaryColor || "#3B82F6";

  const userPrompt = `Create a STUNNING, world-class website for:

BUSINESS: ${request.businessName}
TYPE: ${request.businessType}
ABOUT: ${request.description}
BRAND COLOR: ${primaryColor}

SECTIONS TO INCLUDE:
${sections.map((s, i) => `${i + 1}. ${s.charAt(0).toUpperCase() + s.slice(1)}`).join("\n")}

DESIGN REQUIREMENTS:
1. Hero: Full viewport with gradient overlay on a relevant Unsplash image, bold headline (48-72px), compelling subtext, 2 CTA buttons (primary filled, secondary outline), floating elements or subtle patterns
2. Stats: Animated counter-style numbers for key metrics (e.g., "500+ Clients", "10 Years Experience")
3. Features: 3-4 cards with icons, hover lift effect, subtle shadows
4. About: Split layout with image and text, brand story, mission statement
5. Testimonials: 3 cards with avatars, quotes, names, and titles
6. Pricing: 3 tiers (Basic, Pro highlighted, Enterprise), checkmark features list
7. Contact: Modern form with floating labels or clean inputs, contact info sidebar
8. Footer: Multi-column layout, social icons, copyright

IMAGERY: Use actual Unsplash URLs like:
- https://images.unsplash.com/photo-1497366216548-37526070297c (office)
- https://images.unsplash.com/photo-1522071820081-009f0129c71c (team)
- https://images.unsplash.com/photo-1460925895917-afdab827c52f (business)

Make this website look like it was built by a $200/hr design agency. Premium, polished, ready to launch.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: WEBSITE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 16000,
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content || "";
  
  try {
    const cleanedContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    const parsed = JSON.parse(cleanedContent);
    return {
      html: parsed.html || "",
      css: parsed.css || "",
    };
  } catch (error) {
    console.error("Failed to parse AI response");
    
    // Try to extract HTML directly if JSON parsing fails
    const htmlMatch = content.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
    const cssMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    
    if (htmlMatch) {
      return {
        html: htmlMatch[0],
        css: cssMatch ? cssMatch[1] : "",
      };
    }
    
    throw new Error("Failed to generate website. Please try again.");
  }
}

export async function regenerateSection(
  currentHtml: string,
  currentCss: string,
  sectionName: string,
  instructions: string
): Promise<GeneratedWebsite> {
  const userPrompt = `I have an existing website. Please modify the "${sectionName}" section according to these instructions:

INSTRUCTIONS: ${instructions}

CURRENT WEBSITE HTML:
${currentHtml}

REQUIREMENTS:
1. Keep the overall design consistent
2. Only modify the requested section
3. Maintain the same quality and styling
4. Keep all other sections exactly the same
5. Preserve all functionality and responsiveness

Return the COMPLETE updated HTML with embedded CSS as a JSON object with "html" and "css" keys.
The HTML should be the full document, not just the section.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: WEBSITE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 16000,
    temperature: 0.6,
  });

  const content = response.choices[0]?.message?.content || "";
  
  try {
    const cleanedContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    
    const parsed = JSON.parse(cleanedContent);
    return {
      html: parsed.html || currentHtml,
      css: parsed.css || currentCss,
    };
  } catch (error) {
    console.error("Failed to parse regeneration response");
    
    // Try to extract HTML directly
    const htmlMatch = content.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
    if (htmlMatch) {
      return {
        html: htmlMatch[0],
        css: "",
      };
    }
    
    throw new Error("Failed to update website section. Please try again.");
  }
}
