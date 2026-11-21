import json
import os

DATA_DIR = r"D:\schoolmart\campusmart-base\backend\scripts\data"
RAW_FILE = os.path.join(DATA_DIR, "sportsurf_batch2_raw.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "sportsurf_batch3_environments.json")

# Load raw environments
with open(RAW_FILE, "r", encoding="utf-8") as f:
    raw_data = json.load(f)

masonry_items = raw_data["environments"]["blocks"]["environments_page_content"]["data"]["masonryItems"]
masonry_by_title = {it["t"].strip().upper(): it for it in masonry_items}

# Define the 15 targeted environments with rich metadata, architectural copy, specs, and CTAs
ENV_CONFIGS = [
    {
        "slug": "environment-art-craft-rooms",
        "cleanSlug": "art-craft-rooms",
        "exactMatchTitle": "ART & CRAFT ROOMS",
        "title": "Art & Craft Studios & Creative Workspaces",
        "badge": "Specialized Studio 2026",
        "ctaTitle": "Ready to Build a Specialized Art & Craft Studio on Campus?",
        "ctaSubtitle": "Consult with our educational architects for turnkey spatial design, washable cabinetry, sediment-trap plumbing, and equipment procurement.",
        "ctaButtonLabel": "Request Studio Consultation",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Height-adjustable butcher-block and stain-resistant HPL workstations with 360-degree perimeter access, ADA-compliant clearances, and wide 1.8m circulation aisles."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "8+ Air Changes per Hour (ACH) localized exhaust ventilation for paint/solvent fumes, multi-basin plumbing with clay/plaster sediment traps, and zero-VOC washable surfaces."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Comprehensive architectural layouts, specialized heavy-duty cabinetry installation, ventilated canvas drying racks, and complete fine-art equipment fit-out."
            }
        ],
        "content": (
            "Art and craft studios in modern schools are purposeful, tactile learning environments designed to foster creative expression, fine motor skill mastery, spatial reasoning, and collaborative experimentation. Moving far beyond traditional art classrooms, contemporary studios are engineered with distinct wet and dry functional zones, allowing students to transition seamlessly between dirty tactile mediums—such as clay modeling, ceramics, papier-mâché, and watercolor washes—and clean drafting, graphic design, and printmaking.\n\n"
            "### Architectural Zoning & Spatial Planning\n"
            "The spatial layout prioritizes flexible group configurations and unobstructed educator sightlines. Central collaborative island tables featuring durable, scratch-resistant high-pressure laminate (HPL) or solid butcher-block surfaces support both individual exploration and multi-student team projects. Broad circulation pathways (minimum 1.8 meters) accommodate the safe movement of students carrying bulky canvases and wet projects, while maintaining barrier-free universal accessibility (ADA/RPwD compliance) for students of all physical abilities.\n\n"
            "### Natural Daylighting & Acoustic Balance\n"
            "Visual acuity and true color perception are fundamental in an artistic environment. SchoolMart studios incorporate north-facing daylighting whenever possible to deliver uniform, shadow-free illumination throughout the academic day. This natural light is paired with flicker-free, 5000K daylight-balanced LED task luminaires boasting high Color Rendering Index ratings (CRI 95+). To manage the elevated vocal energy of creative teamwork, acoustic wall paneling with perforated timber or sound-dampening acoustic felt controls reverberation (targeting RT60 between 0.6 and 0.8 seconds) without stifling constructive creative dialogue.\n\n"
            "### Specialized Plumbing & Ventilated Drying Systems\n"
            "Practical art education requires specialized utility infrastructure. Multi-basin stainless steel wash stations are fitted with integrated commercial clay and sediment interceptors, preventing heavy paint solids, plaster, and ceramic slips from clogging school plumbing mains. Hands-free sensor or foot-operated water controls preserve hygiene. For finished and in-progress work, studios feature custom-built ventilated drying racks, dust-free plan chest drawers for poster and watercolor sheets, lockable solvent cabinets complying with fire codes, and dedicated display ledges to celebrate student achievements."
        ),
        "tags": ["Art Studio", "Creative Arts", "Makerspace", "Educational Architecture", "NEP 2020"]
    },
    {
        "slug": "environment-creating-dynamic-learning-spaces-with-furniture-and-storage",
        "cleanSlug": "creating-dynamic-learning-spaces-with-furniture-and-storage",
        "exactMatchTitle": "CREATING DYNAMIC LEARNING SPACES WITH FURNITURE AND STORAGE",
        "title": "Creating Dynamic Learning Spaces with Agile Furniture and Storage",
        "badge": "Agile Design 2026",
        "ctaTitle": "Transform Your Static Classrooms into Dynamic Learning Environments",
        "ctaSubtitle": "Partner with SchoolMart's agile furniture specialists to design flexible, mobile, and space-optimized classroom configurations.",
        "ctaButtonLabel": "Request Spatial Layout Audit",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "BIFMA and EN 1729 certified ergonomic seating and desks with multi-configuration nesting frames mounted on non-marking industrial silent castors."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Formaldehyde-free CARB Phase 2 compliant composite boards, anti-pinch safety hinges, low-VOC finishes, and Class 1 flame-retardant commercial upholstery."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Institutional spatial audits, 3D floor plan layout simulations, direct-from-factory procurement, and professional white-glove assembly."
            }
        ],
        "content": (
            "Educational environments can no longer afford to be static lecture halls of rigid forward-facing desks. Modern cognitive pedagogy requires dynamic, multi-modal learning environments where furniture and storage act as dynamic catalysts for student engagement, autonomy, and diverse pedagogical modalities.\n\n"
            "### The Five Pedagogical Spatial Archetypes\n"
            "SchoolMart dynamic classrooms integrate Thornburg's five key learning zones into a single agile footprint:\n"
            "1. **Campfire Spaces**: Direct instruction and group assembly with semi-circular tiered mobile soft seating.\n"
            "2. **Watering Hole Hubs**: Agile collaborative islands formed by mobile trapezoidal and teardrop desks where peer-to-peer discourse thrives.\n"
            "3. **Cave Retreats**: Quiet acoustic nooks with high-backed felt booths providing introverted reflection and deep individual reading.\n"
            "4. **Life Zones**: Hands-on project surfaces with durable standing-height workbenches and write-on whiteboard tabletops.\n"
            "5. **Porch Thresholds**: Transition corridors with integrated locker cubbies and informal conversation perches.\n\n"
            "### Rapid Reconfigurability in Under 90 Seconds\n"
            "Every piece of mobile furniture is engineered with industrial-grade lockable non-marking castors, lightweight aluminum understructures, and intuitive nesting mechanisms. Teachers and students can reconfigure a 30-student classroom from a traditional seminar layout to six small collaborative pods or a large open presentation circle in less than 90 seconds without heavy lifting or floor scratches.\n\n"
            "### Integrated Organizational Storage Architecture\n"
            "Visual clutter directly impedes student attention and cognitive processing. Our integrated storage systems utilize perimeter low-profile credenzas that double as padded student benches, translucent modular Gratnells tote-tray carts, and individualized lockable student bays. By lifting storage off the central floor plane and utilizing vertical wall space, classrooms gain up to 28% more usable floor area for dynamic student movement."
        ),
        "tags": ["Agile Furniture", "Classroom Architecture", "Flexible Seating", "Modular Storage", "Student-Centric"]
    },
    {
        "slug": "environment-creating-safe-learning-environments-comprehensive-health-and-safety-resources",
        "cleanSlug": "creating-safe-learning-environments-comprehensive-health-and-safety-resources",
        "exactMatchTitle": "CREATING SAFE LEARNING ENVIRONMENTS: COMPREHENSIVE HEALTH AND SAFETY RESOURCES",
        "title": "Creating Safe Learning Environments: Comprehensive Health & Safety Standards",
        "badge": "Campus Safety 2026",
        "ctaTitle": "Fortify Your Campus with State-of-the-Art Safety Infrastructure",
        "ctaSubtitle": "Schedule an institutional safety and regulatory compliance audit covering fire protection, chemical containment, and indoor air quality engineering.",
        "ctaButtonLabel": "Book Safety Compliance Audit",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Universal barrier-free accessibility adhering to RPwD/ADA guidelines, anti-slip floor surfaces (R11 wet-slip certified), and zero pinch-point structural hardware."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Full compliance with National Building Code (NBC 2016) Part 4 fire codes, OSHA/NFPA hazardous chemical containment, and ASHRAE 62.1 ventilation standards."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Campus safety vulnerability audits, certified hazardous containment installation, automated emergency fixture integration, and staff safety operational drills."
            }
        ],
        "content": (
            "Creating institutional learning spaces demands that physical security, environmental health, and statutory compliance serve as the immutable foundation of campus architecture. From early childhood playscapes to advanced secondary laboratories, child safety requires multi-layered prevention, resilient materials, and meticulous adherence to global educational standards.\n\n"
            "### Hazardous Materials & Chemical Storage Engineering\n"
            "In secondary science labs and prep rooms, chemical safety requires strict segregation of incompatible reagents. SchoolMart installs FM-approved double-walled 18-gauge steel flammables cabinets with self-closing three-point fail-safe doors, secondary containment spill berms, and dedicated corrosive acid/base cabinets lined with non-reactive polypropylene. Chemical storage rooms feature continuous non-sparking explosion-proof exhaust fans providing 12+ Air Changes per Hour directly to exterior roof vents.\n\n"
            "### Indoor Air Quality (IAQ) & Cognitive Performance\n"
            "Stale indoor air with elevated carbon dioxide (>1200 ppm) drastically impairs student focus, causes lethargy, and accelerates the transmission of airborne pathogens. Our environmental engineering incorporates continuous IAQ monitoring sensors that modulate mechanical ventilation dampers, delivering filtered, tempered fresh air to keep CO2 concentrations strictly below 800 ppm. MERV-13 and HEPA filtration stages actively eliminate particulate matter (PM2.5), pollen, and airborne volatile organic compounds.\n\n"
            "### Fire Safety, Egress & Life-Safety Protocols\n"
            "All circulation corridors, stairwells, and assembly portals are engineered with unobstructed minimum widths exceeding 2.0 meters, equipped with anti-panic crash bars on outward-opening solid fire-rated doors (2-hour integrity). Photoluminescent floor path marking ensures visibility during power loss, while addressable optical smoke and thermal detectors integrate with voice-evacuation public address systems and localized automatic clean-agent fire suppression in server rooms and libraries."
        ),
        "tags": ["School Safety", "NBC Compliance", "Chemical Storage", "Indoor Air Quality", "Egress Architecture"]
    },
    {
        "slug": "environment-dining-hall-design-to-execution",
        "cleanSlug": "dining-hall-design-to-execution",
        "exactMatchTitle": "DINING HALL DESIGN TO EXECUTION",
        "title": "School Dining Hall Architecture: Design to Turnkey Execution",
        "badge": "Turnkey Facility 2026",
        "ctaTitle": "Modernize Your Campus Cafeteria & Dining Hall Infrastructure",
        "ctaSubtitle": "Partner with SchoolMart for end-to-end dining hall spatial design, industrial stainless steel kitchen equipment, and acoustic comfort engineering.",
        "ctaButtonLabel": "Request Dining Hall Consultation",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Ergonomically contoured fixed-bench and detached seating providing 0.95–1.1 sqm per diner with smooth ADA-compliant wheelchair lanes."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Commercial kitchen grade HVAC exhaust (25-30 ACH in cooking zones, 12-15 ACH in dining hall), stainless grease traps, and FSSAI/HACCP hygiene compliance."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Architectural throughput simulation, commercial 304 stainless steel kitchen fabrication, heavy-duty dining furniture deployment, and complete MEP fit-out."
            }
        ],
        "content": (
            "The institutional dining hall is the social and nutritional epicenter of a school campus. High-performance dining architecture must balance massive student throughput during brief lunch windows with rigorous commercial hygiene, robust mechanical ventilation, and dignified acoustic comfort.\n\n"
            "### Flow Dynamics & Queue Elimination\n"
            "Using computational crowd simulation, SchoolMart dining layouts eliminate cross-traffic and bottlenecking by establishing continuous one-way circulation loops. The journey transitions logically through distinct operational stages:\n"
            "- **Hand Sanitization Vestibules**: Multiple contactless infrared wash basins positioned at hall entries.\n"
            "- **Dual-Sided Serving Pantries**: Heated and refrigerated 304 food-grade stainless steel bain-maries that dispense balanced meals rapidly.\n"
            "- **Decentralized Hydration Stations**: Touchless RO-purified chilled water points distributed throughout the hall.\n"
            "- **Automated Dish Return Belts**: Low-noise conveyor portals where students deposit trays, keeping acoustic dish-clatter insulated from the dining area.\n\n"
            "### Food-Grade Durability & Material Science\n"
            "All tabletops are engineered to withstand extreme institutional wear: seamless solid-core High Pressure Laminate (HPL) with waterproof edging, polished antibacterial quartz, or 304-grade brushed stainless steel. Table surfaces resist boiling water spills, food acids, and aggressive commercial sanitizers. Fold-and-roll mobile bench systems enable cafeteria staff to fold, roll, and stow seating in minutes, transforming the dining hall into an open examination center or multi-purpose auditorium.\n\n"
            "### Acoustic Attenuation & Odor Control\n"
            "Unmanaged dining halls routinely exceed 85 dBA in sound intensity, generating immense stress for students and faculty. We incorporate suspended baffle ceilings made from moisture-resistant acoustic fiberglass (NRC 0.85+) and perforated timber wall wainscoting to lower reverberation. Dedicated HVAC makeup-air systems maintain positive pressure in the dining hall relative to the kitchen, preventing cooking odors from invading student eating zones."
        ),
        "tags": ["Dining Hall", "Commercial Kitchen", "Cafeteria Design", "304 Stainless Steel", "Turnkey Execution"]
    },
    {
        "slug": "environment-home-science-room",
        "cleanSlug": "home-science-room",
        "exactMatchTitle": "HOME SCIENCE ROOM",
        "title": "Home Science & Culinary Arts Laboratory Design",
        "badge": "Specialized Lab 2026",
        "ctaTitle": "Build a Professional Home Science & Culinary Studio on Campus",
        "ctaSubtitle": "Design curriculum-aligned kitchen laboratories and textile studios complete with commercial appliances, safety cutoffs, and modular cabinetry.",
        "ctaButtonLabel": "Consult Culinary Lab Specialist",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Optimized kitchen work-triangle clearances (1.2m between facing counters), adjustable-height prep counters, and clutter-free wire management channels."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "10+ ACH localized kitchen extractors, master emergency utility cutoff controls for gas and electricity, Class K fire protection, and non-porous antimicrobial surfaces."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Custom modular culinary cabinetry, commercial induction and oven procurement, precision plumbing/gas line engineering, and instructional AV integration."
            }
        ],
        "content": (
            "Modern Home Science and Culinary Arts laboratories bridge domestic science, nutritional biochemistry, textile engineering, and consumer economics. These specialized learning suites prepare students for real-world life skills, professional hospitality careers, and sustainable household resource stewardship.\n\n"
            "### Culinary Unit Kitchens & Demonstration Master Island\n"
            "The culinary suite is divided into independent quad-student kitchen workstations designed around the ergonomic kitchen work triangle (prep, cooking, washing). Each workstation is outfitted with commercial-grade induction cooktops, stainless prep sinks with gooseneck sprayers, convection baking ovens, and durable solid-surface quartz worktops. At the front of the studio, a Master Chef demonstration counter features an angled 4K camera and overhead mirror rig that streams live high-definition close-up cooking techniques to student monitors across the room.\n\n"
            "### Textile Crafting & Apparel Design Studio\n"
            "The textile division features heavy-duty hardwood layout tables for fabric pattern cutting and drafting, recessed power track channels for electric sewing machines, heavy-duty sergers, pressing stations with commercial steam generators, and ventilated garment closets to store student fashion projects. Lighting is calibrated to 5000K daylight spectrum to ensure precise color-matching and thread inspection.\n\n"
            "### Child Development & Household Economics Suite\n"
            "To support curricula in human development, child care, and family resource management, the suite includes a dedicated simulation zone equipped with developmental anatomy models, infant care mock stations, budget management computing terminals, and modern ergonomic laundry appliances for fabric science analysis.\n\n"
            "### Comprehensive Utility Safety Architecture\n"
            "Because open flames, hot oils, and electrical loads coexist, life safety is paramount. The room features a master educator control console with instantaneous emergency solenoid shutoffs for all gas and electrical supplies. Dedicated Class K wet-chemical kitchen fire extinguishers, ceiling fire blankets, emergency eyewash basins, and 10+ ACH localized canopy hoods protect students during every practical examination."
        ),
        "tags": ["Home Science", "Culinary Lab", "Textile Studio", "Life Skills", "Hospitality Training"]
    },
    {
        "slug": "environment-indoor-play-n-activity-rooms",
        "cleanSlug": "indoor-play-n-activity-rooms",
        "exactMatchTitle": "INDOOR PLAY N ACTIVITY ROOMS",
        "title": "Indoor Play & Multi-Activity Rooms for Early Childhood",
        "badge": "Early Years 2026",
        "ctaTitle": "Design an Inspiring Indoor Play & Activity Wonderland",
        "ctaSubtitle": "Transform vacant interior spaces into safe, certified, and pedagogically rich indoor activity complexes for early childhood learners.",
        "ctaButtonLabel": "Request Indoor Play Plan",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Child-scale anthropometric clearances, radius-rounded corner joinery, and pinch-free structural hinges across all play equipment modules."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Full compliance with EN 71 toy safety and EN 1176 playground standards, non-toxic food-grade polyurethane coatings, and continuous HEPA fresh air exchange."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Conceptual architectural theme design, custom soft-play fabrication, impact-rated flooring installation, and educator activity curriculum guides."
            }
        ],
        "content": (
            "Unfavorable outdoor weather—from monsoon downpours to extreme summer heat and urban air quality challenges—must never interrupt young children's vital physical and creative play. SchoolMart indoor play and activity rooms provide weather-independent, stimulating environments that cultivate gross and fine motor skills, social empathy, language development, and cooperative problem-solving.\n\n"
            "### Multi-Sensory Activity Micro-Zones\n"
            "Our early childhood architects partition the indoor room into specialized developmental zones:\n"
            "- **Dramatic Role-Play Village**: Child-sized play storefronts, miniature veterinary clinics, grocery markets, and play kitchens that stimulate narrative language and cooperative empathy.\n"
            "- **Constructive Tinkering Arena**: Large tactile EVA building blocks, wooden gears, magnetic wall panels, and STEM interlocking tiles that develop spatial geometry.\n"
            "- **Sensory Discovery Stations**: Spill-contained kinetic sand, water exploration tables, and textured sensory tactile boards that engage neurodivergent tactile processing.\n"
            "- **Active Movement Obstacle Course**: Low-profile balance beams, crawl-through foam tunnels, soft stepping stones, and gentle incline slides.\n\n"
            "### Certified Impact-Absorbing Flooring\n"
            "Safety during energetic play is secured through dual-density sports vinyl underlaid with closed-cell polyolefin foam, certified for Critical Fall Height (EN 1177). The flooring is seamless, non-slip, anti-static, and treated with antimicrobial silver-ion technology that repels bacteria, viruses, and allergens.\n\n"
            "### Calming Breakout Retreats\n"
            "Recognizing that active sensory environments can occasionally overwhelm young children, each room incorporates cozy acoustic reading cocoons and dimmable, felt-lined sensory hideaways where children can self-regulate in peace while remaining visible to supervising teachers."
        ),
        "tags": ["Indoor Play", "Early Childhood", "Sensory Play", "Soft Play", "Motor Skills"]
    },
    {
        "slug": "environment-interactive-kids-library",
        "cleanSlug": "interactive-kids-library",
        "exactMatchTitle": "INTERACTIVE KIDS LIBRARY",
        "title": "Interactive Kids Library & Digital Discovery Commons",
        "badge": "Digital Commons 2026",
        "ctaTitle": "Reimagine Your School Library as an Interactive Discovery Commons",
        "ctaSubtitle": "Consult with our library design team for custom tiered seating, forward-facing book displays, acoustic wall systems, and interactive tech integration.",
        "ctaButtonLabel": "Schedule Library Consultation",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Low-level forward-facing book displays (height <1.1m for K-5), child-proportioned soft seating, and accessible wide aisle ways (1.5m+)."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Flame-retardant Class A book displays, zero-emission low-VOC paints and glues, and constant clean air filtration for book preservation and child respiratory health."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Spatial concept design, 3D acoustic engineering, RFID/digital cataloging system integration, and modular library furniture manufacturing."
            }
        ],
        "content": (
            "The 21st-century school library has evolved from a silent repository of printed books into an active, multi-sensory discovery commons where physical literature, digital storytelling, collaborative media production, and hands-on making converge to ignite a lifelong passion for reading.\n\n"
            "### Forward-Facing Child-Centric Architecture\n"
            "Traditional spine-out library shelving overwhelms young readers. SchoolMart library spaces utilize low-height, forward-facing book displays where vibrant book covers entice children to browse independently. Shelving heights are strictly capped under 1.1 meters for early years, ensuring natural daylight floods deep into the interior and giving educators unobstructed line-of-sight across the entire room.\n\n"
            "### Multi-Tiered Storytelling Amphitheater\n"
            "At the heart of the library lies a carpeted amphitheater with stepped tiered benching where educators read aloud, host visiting authors, or project interactive storybooks onto large motorized screens. Integrated storage beneath each tier stows floor cushions, puppet theaters, and props when not in use.\n\n"
            "### Digital Exploration & Immersive Tech Zones\n"
            "Alongside traditional print collections, the interactive library integrates digital audio stations with volume-limiting child-safe headphones, interactive touchscreen discovery tables where children explore interactive encyclopedias, and augmented reality (AR) book nooks where 3D characters emerge from page illustrations to deepen comprehension.\n\n"
            "### Acoustic Zoning & Biophilic Comfort\n"
            "Sound-absorbing ceiling clouds, acoustic felt wall graphics, and sound-muffling wool carpet tiles achieve an ambient sound level of 35-40 dBA in individual reading pods, while allowing lively collaborative inquiry in maker corners without acoustic discord."
        ),
        "tags": ["Kids Library", "Media Commons", "Storytelling", "Acoustic Zoning", "Literacy Design"]
    },
    {
        "slug": "environment-jungle-room-features",
        "cleanSlug": "jungle-room-features",
        "exactMatchTitle": "JUNGLE ROOM FEATURES",
        "title": "Jungle-Themed Immersive Early Learning Environments",
        "badge": "Immersive Theme 2026",
        "ctaTitle": "Bring Nature Indoors with a Custom Jungle Learning Environment",
        "ctaSubtitle": "Partner with our experiential design architects to build immersive themed rooms, treehouse lofts, and biophilic playscapes for early years.",
        "ctaButtonLabel": "Request Themed Room Proposal",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Fall-height engineered elevated lofts with EN 1176 compliant balustrades, soft-landing safety mats, and accessible lower activity decks."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Class 1 fire-retardant artificial plants, non-toxic eco-solvent wall graphics, non-hazardous paints, and anti-microbial biophilic finishes."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Custom 3D environmental sculpting, structural engineering certification for elevated lofts, theatrical lighting setup, and professional site installation."
            }
        ],
        "content": (
            "Children possess an innate, instinctual affinity for nature and living systems—a psychological phenomenon known as biophilia. When educational environments channel the wonder of tropical canopies, wild wildlife habitats, and adventurous forest expeditions, early learners demonstrate marked increases in verbal expression, imaginative play, emotional resilience, and sensory integration.\n\n"
            "### 3D Environmental Sculpting & Architectural Murals\n"
            "SchoolMart jungle environments replace cold institutional drywall with custom hand-painted panoramic murals, eco-solvent non-toxic wall coverings, and realistic 3D tree canopies engineered from certified flame-retardant structural polymers. Giant faux monstera and palm leaves sweep across the ceiling plane, concealing technical conduits while diffusing light to create the magical ambiance of a sun-dappled rainforest.\n\n"
            "### Structural Treehouse Lofts & Safari Cabanas\n"
            "Engineered in compliance with strict structural standards, our elevated treehouse play lofts provide children with thrilling vantage points to observe their peers, read, or engage in dramatic play. Features include:\n"
            "- Solid hardwood climbing rungs with non-slip grips.\n"
            "- Heavy-duty safety netting and 1.2m tall solid acrylic balustrades.\n"
            "- Enclosed safari tent hideaways fitted with soft canvas drapes and LED fairy lanterns.\n"
            "- Low-profile rope bridges and crawl-through tree trunk tunnels.\n\n"
            "### Multi-Sensory Biophilic Lighting & Soundscapes\n"
            "Concealed architectural RGBW LED fixtures simulate the natural daylight transitions of a jungle canopy, shifting from a bright, energizing morning sunrise to warm, calming dusk hues. Integrated high-fidelity sound modules gently play subtle ambient rainforest audio—soft rain, distant bird calls, gentle breezes—proven to lower cortisol levels and calm restless preschoolers."
        ),
        "tags": ["Jungle Theme", "Biophilic Architecture", "Themed Classroom", "Treehouse Loft", "Early Learning"]
    },
    {
        "slug": "environment-kindergarten-primary-physical-activity-room",
        "cleanSlug": "kindergarten-primary-physical-activity-room",
        "exactMatchTitle": "KINDERGARTEN/ PRIMARY PHYSICAL ACTIVITY ROOM",
        "title": "Kindergarten & Primary Physical Activity & Gross Motor Studio",
        "badge": "Active Movement 2026",
        "ctaTitle": "Equip Your Campus with an Indoor Physical Movement Studio",
        "ctaSubtitle": "Design dedicated indoor gymnasiums and motor skill activity rooms with certified shock-absorbing flooring and modular agility apparatus.",
        "ctaButtonLabel": "Consult Sports & Movement Specialist",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Unhindered 4.0m minimum clear activity height, shock-absorbing athletic floors reducing joint impact by up to 50%, and rounded edge perimeter barriers."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "12 ACH fresh air exchange for vigorous exercise, high-impact safety wall padding up to 1.8m, and shatterproof polycarbonate mirror panels."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Sports flooring supply and laser-level subfloor installation, wall padding fabrication, gymnasium hardware mounting, and physical literacy equipment packages."
            }
        ],
        "content": (
            "During kindergarten and primary years, brain development is directly linked to physical vestibular movement. Sedentary classroom routines must be counterbalanced by high-energy movement studios designed specifically for gross motor skill progression, balance coordination, cardiovascular stamina, and physical literacy.\n\n"
            "### Certified Athletic Sports Flooring Systems\n"
            "Young joints and growing bones require maximum shock absorption. SchoolMart installs seamless point-elastic polyurethane and vulcanized rubber athletic flooring systems certified to EN 14904 standards. The flooring absorbs upwards of 45% of impact energy, drastically reducing fall-related injuries while delivering high traction (anti-slip rating R10) for rapid directional changes and active games.\n\n"
            "### Modular Agility Apparatus & Swedish Wall Ladders\n"
            "The studio features modular, reconfigurable equipment that physical educators can adapt for gymnastics, yoga, dance, and obstacle challenges:\n"
            "- **Wall-Mounted Swedish Climbing Lattices**: Solid beechwood wall bars for climbing, flexibility, and core strength.\n"
            "- **Interlocking Agility Blocks**: High-density foam vaulting boxes, balance beams, and incline wedges.\n"
            "- **Low-Level Bouldering Walls**: Horizontal traversing climbing walls with color-coded handholds designed for safe, harness-free climbing with 300mm crash mats.\n\n"
            "### Protective Wall Padding & Posture Mirrors\n"
            "To safeguard energetic children dashing across the room, all perimeter walls up to 1.8 meters are lined with high-density flame-retardant foam impact pads wrapped in durable, washable marine vinyl. Full-height shatterproof polycarbonate mirrors enable students to develop body spatial awareness, posture alignment, and motor coordination during dance and movement exercises.\n\n"
            "### Climate Control & Odor Management\n"
            "Intense physical exertion demands superior climate engineering. Dedicated HVAC systems supply 12+ Air Changes per Hour of tempered fresh air, maintaining low humidity and swiftly extracting heat and perspiration odors."
        ),
        "tags": ["Physical Activity", "Gross Motor", "Sports Flooring", "Indoor Gymnasium", "Child Wellness"]
    },
    {
        "slug": "environment-mini-auditoriums-for-schools",
        "cleanSlug": "mini-auditoriums-for-schools",
        "exactMatchTitle": "MINI AUDITORIUMS FOR SCHOOLS",
        "title": "Mini Auditoriums & Multi-Purpose Performance Theaters for Schools",
        "badge": "Performing Arts 2026",
        "ctaTitle": "Commission a World-Class Mini Auditorium on Your School Campus",
        "ctaSubtitle": "Consult with our auditorium architects and acoustic engineers for complete acoustic modeling, stage lighting, and AV integration.",
        "ctaButtonLabel": "Request Auditorium Consultation",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "International sightline ISO clearance (C-value > 60mm), dedicated ADA wheelchair positions with companion seating, and wide 1.2m egress gangways."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Stage motorized fire curtain systems, emergency low-voltage floor pathway illumination, and silent HVAC ductwork (<NC-25 background acoustic rating)."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Comprehensive electro-acoustic 3D modeling, theatrical AV/lighting engineering, stage rigging, and luxury tiered tip-up chair installation."
            }
        ],
        "content": (
            "While large monolithic auditoriums often sit vacant for most of the school year, mini-auditoriums (seating 100 to 350 occupants) represent the most utilized, cost-effective, and versatile cultural hubs on a modern campus. These intimate performance spaces host student theatrical plays, chamber music concerts, inter-school debates, academic symposiums, parent orientations, and faculty masterclasses.\n\n"
            "### Parabolic Tiered Rake & Sightline Engineering\n"
            "Every seat in the house must provide a clear, commanding view of the stage. SchoolMart engineers parabolic tiered rakes adhering to strict sightline clearance standards (C-value > 60mm), eliminating head-obstruction from rows ahead. Ergonomic commercial auditorium seating features silent gravity-assisted tip-up mechanisms, integrated fold-away writing tablets for examinations, cold-cure molded foam, and acoustic-transparent stain-resistant commercial fabric.\n\n"
            "### Computational Electro-Acoustic Tuning\n"
            "Vocal intelligibility without electronic feedback is the hallmark of fine theater architecture. Our acoustic engineers calibrate the room's Reverberation Time (RT60 between 0.8 and 1.0 seconds) utilizing wooden diffusion slats, acoustic resonators, and deep-cavity broadband sound absorbers. Background noise from air conditioning is eliminated using silencer baffles and acoustic duct wraps, maintaining an ultra-quiet Noise Criterion rating below NC-25.\n\n"
            "### Professional Stage Rigging & Theatrical AV Systems\n"
            "The performance stage is constructed with sprung timber flooring finished in non-reflective matte black. Key theatrical technologies include:\n"
            "- Motorized lighting trusses with energy-efficient DMX-controlled LED profile spots and cyclorama wash fixtures.\n"
            "- High-lumen 4K laser projection onto motorized acoustic micro-perforated screens.\n"
            "- Dante-enabled digital audio network with wireless lapel microphones and line-array column speakers.\n"
            "- Fully equipped backstage green rooms, dressing zones, and a central technician control booth with direct stage sightlines."
        ),
        "tags": ["Mini Auditorium", "Acoustic Engineering", "Theatrical Lighting", "Stage Architecture", "AV Integration"]
    },
    {
        "slug": "environment-rumpus-rooms",
        "cleanSlug": "rumpus-rooms",
        "exactMatchTitle": "RUMPUS ROOMS",
        "title": "Early Childhood Rumpus Rooms & Active Playrooms",
        "badge": "Early Learning 2026",
        "ctaTitle": "Create an Unforgettable Rumpus Room for Early Learners",
        "ctaSubtitle": "Let our early childhood design experts create a fun, safe, soft-padded play environment that builds confidence and social skills.",
        "ctaButtonLabel": "Design a Rumpus Playroom",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Toddler-scaled furniture clearances, soft-edge cushioning on all perimeter elements, and barrier-free open floor plans."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Certified non-toxic phthalate-free vinyl, Class 1 fire-rated soft foam cores, and high air exchange HVAC filtration."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Bespoke soft-play component manufacturing, certified impact safety flooring installation, and turnkey early childhood room styling."
            }
        ],
        "content": (
            "A rumpus room—frequently designated as an active playroom or creative recreation hub—is a specialized spatial asset within modern kindergartens, preschools, and early childhood centers. It provides toddlers and young children with a secure, highly stimulating environment to engage in exuberant physical play, creative fantasy exploration, and spontaneous peer socialization without the constraints of formal desk learning.\n\n"
            "### Spatial Layout & Child-Paced Exploration\n"
            "SchoolMart rumpus rooms are designed to give young children agency over their physical environment. The space features open central expanses for gross motor games and dance, surrounded by designated low-stimulus perimeter activity hubs:\n"
            "- **Oversized Soft Foam Construction Hubs**: Giant modular blocks, cylinders, and arches that children can stack, tumble, and rebuild safely.\n"
            "- **Imaginative Role-Playing Trunks**: Accessible low-height open storage units stocked with costumes, hand puppets, and props.\n"
            "- **Tactile Floor Lounges**: High-density foam mats and oversized velvet floor beanbags for peaceful picture-book browsing.\n\n"
            "### Soft Architecture & Total Child Protection\n"
            "Because early learners tumble frequently, the entire room is constructed using soft architectural principles. Sharp corners and exposed structural fasteners are strictly eliminated. Vertical wall surfaces up to 1.2 meters are clad in high-density foam padding wrapped in antimicrobial, phthalate-free commercial vinyl. Floor systems feature multi-layered shock-absorbing cushions that absorb impact energy and keep floor temperatures comfortable for barefoot crawling.\n\n"
            "### Organization, Hygiene & Educator Supervision\n"
            "Uncluttered visual environments encourage calm behavior. Low-height open cubby units with transparent bins enable children to retrieve and put away play materials independently. Strategically planned sightlines ensure that supervising teachers maintain continuous 360-degree visibility across all corners from any point in the room."
        ),
        "tags": ["Rumpus Room", "Early Years", "Play-Based Learning", "Soft Architecture", "Toddler Safety"]
    },
    {
        "slug": "environment-smart-music-rooms-professional-",
        "cleanSlug": "smart-music-rooms-professional",
        "exactMatchTitle": "SMART MUSIC ROOMS [ PROFESSIONAL ]",
        "title": "Smart Music Studios & Professional Acoustic Recording Suites",
        "badge": "Acoustic Suite 2026",
        "ctaTitle": "Build a Professional Smart Music Studio on Campus",
        "ctaSubtitle": "Consult with our studio acoustic designers for turnkey soundproof recording suites, instrument lockers, and digital audio workstation integration.",
        "ctaButtonLabel": "Request Music Studio Audit",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Modular instrument rehearsal layout with multi-tier choir/band risers and ergonomic music posture chairs with integrated instrument rests."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Ultra-quiet HVAC system attenuated via acoustic silencers (maintaining <NC-20 ambient noise criteria), zero-vibration air delivery."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Full acoustic laboratory simulation, specialized sound isolation carpentry, studio gear procurement, and studio software configuration."
            }
        ],
        "content": (
            "Transforming music education requires spaces that blend world-class architectural acoustics with modern digital audio workstation (DAW) technology. Professional smart music suites allow school music programs to teach symphonic orchestra, choral harmony, contemporary music composition, and audio engineering in a fully soundproof, acoustically pristine environment.\n\n"
            "### True Architectural Soundproofing (STC 55+)\n"
            "School music rooms generate high decibel levels (often exceeding 100 dBA from brass and percussion) that can disrupt nearby academic classrooms. SchoolMart deploys decoupled 'box-in-a-box' architectural construction:\n"
            "- Floating concrete floors set on elastomeric acoustic isolation pads.\n"
            "- Double-stud drywall assemblies decoupled with resilient sound isolation clips.\n"
            "- Dual acoustic soundproof doors with magnetic perimeter drop-seals and acoustic airlock vestibules.\n"
            "- Triple-glazed angled observation glass isolating the live rehearsal hall from the digital control booth.\n\n"
            "### Precision Reverberation Control & Variable Acoustics\n"
            "Inside the rehearsal hall, sound clarity is tuned to perfection. Corner bass traps absorb muddy low-frequency resonance, while mid-frequency fabric absorption panels and quadratic residue diffusers (QRD) scatter sound evenly across the room without flutter echoes. Motorized acoustic drapes can be drawn or retracted via a wall-mounted touch panel, allowing the room's reverberation time to dynamically adjust between 0.5s for dry vocal recording and 1.2s for rich symphonic rehearsals.\n\n"
            "### Climate-Controlled Instrument Preservation Lockers\n"
            "Fine acoustic wooden instruments—such as violins, cellos, flutes, and classical guitars—are vulnerable to humidity and temperature fluctuations. We install custom velvet-lined instrument lockers equipped with micro-climate dehumidification maintaining constant 45–55% relative humidity, protecting school investments for decades.\n\n"
            "### Tablet-Controlled Smart Infrastructure\n"
            "Educators manage the entire suite from an intuitive wireless tablet: controlling multi-track live stem recording, motorized microphone booms, audio routing to individual student monitor headphones, and circadian mood lighting presets calibrated to performance modes."
        ),
        "tags": ["Smart Music", "Soundproofing", "Acoustic Studio", "Recording Booth", "Digital Audio Workstation"]
    },
    {
        "slug": "environment-smart-stem-labs-design-to-execution",
        "cleanSlug": "smart-stem-labs-design-to-execution",
        "exactMatchTitle": "SMART STEM LABS DESIGN TO EXECUTION",
        "title": "Smart STEM & STEAM Laboratories: Concept to Turnkey Execution",
        "badge": "Innovation Lab 2026",
        "ctaTitle": "Launch an Advanced Smart STEM & Robotics Lab in Your School",
        "ctaSubtitle": "From 3D printers and laser cutters to ESD workstations and teacher curriculum training—SchoolMart delivers turnkey STEM lab excellence.",
        "ctaButtonLabel": "Request Turnkey STEM Proposal",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Heavy-duty maple butcher-block maker benches with pneumatic height adjustability and overhead retractable utility power drops."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Dedicated localized HEPA fume extraction for 3D printing and laser cutting, master emergency power cutoff switches, and ESD-protected conductive flooring."
            },
            {
                "label": "Turnkey Execution",
                "desc": "ATL/STEM curriculum equipment procurement, architectural lab fit-out, MEP power grid installation, and teacher training certifications."
            }
        ],
        "content": (
            "Science, Technology, Engineering, and Mathematics (STEM) labs are the innovation engines of 21st-century schools. Designed in direct alignment with NEP 2020 and global Atal Tinkering Lab guidelines, SchoolMart smart STEM labs transform passive rote memorization into active, project-based engineering, rapid digital fabrication, robotics prototyping, and algorithmic problem-solving.\n\n"
            "### Integrated Functional STEM Lab Zones\n"
            "Our architectural layout organizes the lab into four collaborative zones that mimic real-world engineering hubs:\n"
            "1. **Ideation & Coding Studio**: Mobile nesting tables with integrated dry-erase whiteboard tops and high-speed data connectivity for coding, CAD design, and algorithm modeling.\n"
            "2. **Rapid Prototyping & Digital Fabrication**: Heavy-duty workbenches hosting enclosed FDM/SLA 3D printers, precision laser cutters, and tabletop CNC routers equipped with dedicated localized HEPA carbon fume filtration.\n"
            "3. **Robotics, Electronics & Circuitry Bay**: Conductive ESD-safe workbenches fitted with grounded soldering stations, fume extractors, digital oscilloscopes, and standardized robotics practice arenas.\n"
            "4. **Wet Chemistry & Bio-Exploration Station**: Chemical-resistant epoxy sinks with eyewash stations, precision digital microscopes, and automated sensor logging apparatus.\n\n"
            "### Overhead Utility Power Grid\n"
            "To eliminate treacherous extension cords across student work areas, our labs feature ceiling-mounted retractable spring-loaded power reels and compressed air drops. Workstations can be freely rearranged anywhere across the lab while maintaining instant overhead electrical connectivity.\n\n"
            "### Safety First: Comprehensive Industrial Controls\n"
            "Student safety in active prototyping spaces is ensured through a master instructor power kill-switch console, certified laser-safe optical enclosures, shadow-board tool cabinets for instant visual inventory, safety goggles sanitization cabinets, and Class ABC fire extinguishers."
        ),
        "tags": ["STEM Lab", "Robotics", "Makerspace", "3D Printing", "Turnkey Innovation"]
    },
    {
        "slug": "environment-the-importance-of-daylight-in-classrooms",
        "cleanSlug": "the-importance-of-daylight-in-classrooms",
        "exactMatchTitle": "THE IMPORTANCE OF DAYLIGHT IN CLASSROOMS",
        "title": "The Importance of Daylight in Classrooms: Architectural Strategies & Biophilic Design",
        "badge": "Biophilic Architecture 2026",
        "ctaTitle": "Optimize Campus Daylighting & Reduce Energy Costs by Up to 60%",
        "ctaSubtitle": "Request an architectural daylighting and solar glare assessment to illuminate classrooms with healthy, productivity-enhancing natural light.",
        "ctaButtonLabel": "Request Daylighting Audit",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Daylighting optimization targeting Spatial Daylight Autonomy (sDA > 75%) and Annual Sunlight Exposure (ASE < 10%) per LEED v4 and WELL standards."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Low-E laminated safety glass preventing shatter hazards, automated natural cross-ventilation window actuators, and motorized solar glare blinds."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Computational solar ray-tracing simulation, architectural fenestration retrofits, daylight-harvesting sensor integration, and smart LED deployment."
            }
        ],
        "content": (
            "Decades of neuro-architectural and educational research conclusively demonstrate that access to natural daylight is one of the single most influential environmental factors impacting academic achievement. Peer-reviewed studies confirm that students in classrooms with optimal natural daylighting progress up to 20% faster in mathematics and 26% faster in reading comprehension compared to peers in windowless or poorly lit environments.\n\n"
            "### Biological & Neuro-Pedagogical Mechanisms of Daylight\n"
            "The human eye contains intrinsically photosensitive retinal ganglion cells (ipRGCs) that regulate our circadian rhythm and melatonin secretion. Exposure to full-spectrum natural daylight triggers serotonin production—improving mood, focus, and emotional resilience—while optimizing pupil contraction to eliminate visual fatigue and headaches associated with artificial flicker.\n\n"
            "### Passive Architectural Daylighting Strategies\n"
            "Effective classroom daylighting goes far beyond simply installing larger glass windows; it requires precise solar orientation and glare management:\n"
            "- **Bilateral Daylighting**: Introducing window fenestrations on opposing walls to achieve balanced, cross-illuminated classrooms without harsh dark shadows.\n"
            "- **Architectural Light Shelves**: Exterior and interior horizontal shelves positioned above eye level that bounce incoming solar rays deep into the ceiling plane, illuminating desks up to 9 meters from exterior walls.\n"
            "- **Clerestory & High-Ribbon Windows**: High-level glazing that captures sky light and diffuses it evenly across the floor plane.\n"
            "- **Solar Shading & Automated Louvers**: Exterior brise-soleil and automated micro-perforated blinds calibrated to sun angles to prevent thermal heat gain and optical screen glare.\n\n"
            "### Smart Daylight Harvesting & Circadian Artificial Lighting\n"
            "SchoolMart integrates intelligent photocell daylight-harvesting sensors that continuously measure ambient sunlight. As natural daylight floods the classroom, overhead LED luminaires dim automatically, maintaining a constant 500 lux desk illumination while slashing campus electrical energy consumption by up to 60%. Tunable white LEDs dynamically transition color temperatures—from 5000K crisp white during morning study sessions to warm 3500K during afternoon creative tasks."
        ),
        "tags": ["Daylighting", "Biophilic Architecture", "Energy Efficiency", "Circadian Lighting", "Student Wellbeing"]
    },
    {
        "slug": "environment-why-should-classroom-walls-be-more-than-just-whiteboards-",
        "cleanSlug": "why-should-classroom-walls-be-more-than-just-whiteboards",
        "exactMatchTitle": "WHY SHOULD CLASSROOM WALLS BE MORE THAN JUST WHITEBOARDS?",
        "title": "Dynamic Classroom Walls: Transforming Vertical Surfaces into Active Learning Landscapes",
        "badge": "Active Walls 2026",
        "ctaTitle": "Upgrade Your Classroom Walls into Active Collaborative Learning Canvases",
        "ctaSubtitle": "Transform blank classroom walls with magnetic ceramic-steel whiteboards, acoustic display panels, and student-centered vertical learning zones.",
        "ctaButtonLabel": "Consult Classroom Wall Specialist",
        "ctaHref": "/contact-us",
        "technicalParameters": [
            {
                "label": "Spatial Ergonomics",
                "desc": "Anthropometrically zoned vertical heights (0.6m–1.8m for primary, 0.8m–2.2m for secondary) providing comfortable writing reach for all students."
            },
            {
                "label": "Safety & Ventilation",
                "desc": "Zero-VOC wall adhesives, shatterproof laminated safety glass boards with pencil-polished edges, and flame-retardant Class A acoustic felt."
            },
            {
                "label": "Turnkey Execution",
                "desc": "Site acoustic and wall layout mapping, porcelain ceramic steel panel fabrication, magnetic wall fitting, and modular perimeter track installation."
            }
        ],
        "content": (
            "In traditional school architecture, classroom walls have functioned as passive structural boundaries: four static drywall barriers interrupted only by a single teacher-dominated whiteboard at the front of the room. Modern educational research demonstrates that vertical surfaces represent the most underutilized cognitive real estate in a school.\n\n"
            "### The Science of Vertical Non-Permanent Surfaces (VNPS)\n"
            "Grounded in Peter Liljedahl's breakthrough research in *Building Thinking Classrooms*, replacing passive desks with Vertical Non-Permanent Surfaces (VNPS) transforms student behavior:\n"
            "- **Immediate Cognitive Engagement**: When students stand at a vertical surface, their posture increases alertness, active thinking begins in under 20 seconds, and anonymity disappears.\n"
            "- **Visible Collaborative Thinking**: Ideas, mathematical solutions, and sketches are visible to the entire room, promoting peer borrowing, critique, and spontaneous cross-pollination.\n"
            "- **Kinesthetic Bilateral Integration**: Writing on vertical surfaces engages core stability, shoulder biomechanics, and spatial hand-eye coordination.\n\n"
            "### Multi-Functional Vertical Wall Zoning\n"
            "SchoolMart engineers 360-degree interactive classroom perimeters featuring distinct multi-layered zones:\n"
            "1. **Porcelain Ceramic-Steel Dry-Erase Panels**: Ultra-durable e3 ceramic steel surfaces that resist ghosting, scratching, and chemical disinfectants with a 25-year institutional warranty. Magnetic properties allow students to combine written annotations with physical manipulatives.\n"
            "2. **Acoustic Tackable Felt Panels**: High-NRC recycled PET acoustic panels that dampen classroom chatter while offering elegant pinnable display zones for student artwork and project rubrics.\n"
            "3. **Modular Aluminum Track Railings**: Continuous perimeter hanging rails that allow teachers to slide whiteboards, pegboards, and chart holders effortlessly around the room.\n"
            "4. **Tactile & Interactive Digital Nodes**: Seamless integration of interactive 4K touchscreens, write-and-wipe lower sensory tracks for early learners, and flip-down standing laptop ledges."
        ),
        "tags": ["Vertical Learning", "Classroom Walls", "Thinking Classrooms", "Acoustic Felt", "Collaborative Spaces"]
    }
]

print(f"Total planned configs: {len(ENV_CONFIGS)}")

compiled_items = []

for cfg in ENV_CONFIGS:
    title_key = cfg["exactMatchTitle"].strip().upper()
    matched_raw = masonry_by_title.get(title_key)

    if not matched_raw:
        raise ValueError(f"Could not find exact match for title '{title_key}' in raw masonry items!")

    img = matched_raw.get("img") or matched_raw.get("mainImg")
    mainImg = matched_raw.get("mainImg") or matched_raw.get("img")
    raw_desc = matched_raw.get("description", "").strip()
    raw_card_desc = matched_raw.get("cardDescription", "").strip()

    # Combine original copy insights if helpful
    full_content = cfg["content"]
    if raw_desc and len(raw_desc) > 200:
        full_content += f"\n\n### Architectural Specifications & Historical Overview\n{raw_desc}"

    item_dict = {
        "slug": cfg["slug"],
        "cleanSlug": cfg["cleanSlug"],
        "title": cfg["title"],
        "heroImg": mainImg,
        "image": img,
        "badge": cfg["badge"],
        "cardDescription": raw_card_desc or cfg["ctaSubtitle"],
        "originalDescription": raw_desc,
        "content": full_content,
        "technicalParameters": cfg["technicalParameters"],
        "taxonomy": ["Learning Environments", "Architecture", "2026 Spec"],
        "ctaTitle": cfg["ctaTitle"],
        "ctaSubtitle": cfg["ctaSubtitle"],
        "ctaButtonLabel": cfg["ctaButtonLabel"],
        "ctaHref": cfg["ctaHref"],
        "hubSlug": "environments",
        "hubTitle": "Learning Environments",
        "specs": [
            f"{p['label']}: {p['desc']}" for p in cfg["technicalParameters"]
        ],
        "tags": cfg["tags"],
        "btn1Label": cfg["ctaButtonLabel"],
        "btn1Path": cfg["ctaHref"],
        "btn2Label": "Download Environment Guide",
        "btn2Path": "/contact-us",
        "heroTitle": cfg["title"],
        "heroEyebrow": "Learning Environments",
        "category": "Learning Environments",
        "body": full_content,
        "styles": {
            "ctaBg": "#002a6c"
        },
        "blocks": {}
    }
    compiled_items.append(item_dict)

print(f"Successfully compiled {len(compiled_items)} items with 100% exact image matching.")

# Save to target JSON file
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(compiled_items, f, indent=2, ensure_ascii=False)

print(f"Saved complete Batch 3 dataset to {OUTPUT_FILE}")
