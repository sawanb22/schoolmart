const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../src/admin/components/UnifiedPageEditor.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add icons to lucide-react import
content = content.replace(
    "import { Save, Plus, Trash2, Link as LinkIcon, X, ArrowLeft, ArrowRight, FileText, Eye, EyeOff, Sparkles, Type, Palette, Layout, Sliders, Layers, ChevronUp, ChevronDown, CheckCircle, ShieldCheck, BookOpen, Pencil } from 'lucide-react';",
    "import { Save, Plus, Trash2, Link as LinkIcon, X, ArrowLeft, ArrowRight, FileText, Eye, EyeOff, Sparkles, Type, Palette, Layout, Sliders, Layers, ChevronUp, ChevronDown, CheckCircle, ShieldCheck, BookOpen, Pencil, Check, Tag, FolderOpen, ExternalLink } from 'lucide-react';"
);

// 2. Remove unused newGlobalCategoryInput
content = content.replace(
    "    const [newGlobalCategoryInput, setNewGlobalCategoryInput] = useState('');\n",
    ""
);
content = content.replace(
    "    const [newGlobalCategoryInput, setNewGlobalCategoryInput] = useState('');\r\n",
    ""
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Successfully fixed icons and unused state in UnifiedPageEditor.tsx');
