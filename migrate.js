const fs = require('node:fs');

// AuthPage
let authContent = fs.readFileSync('d:/Page_Pulse/frontend/src/pages/AuthPage.tsx', 'utf8');
authContent = authContent.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { Shield, Key, Lock, User as UserIcon, SignOut, CheckCircle, Eye, EyeSlash, WarningCircle, ArrowRight } from '@phosphor-icons/react';");
authContent = authContent.replaceAll('<CheckCircle2', '<CheckCircle');
authContent = authContent.replaceAll('<EyeOff', '<EyeSlash');
authContent = authContent.replaceAll('<AlertCircle', '<WarningCircle');
authContent = authContent.replaceAll('<LogOut', '<SignOut');
fs.writeFileSync('d:/Page_Pulse/frontend/src/pages/AuthPage.tsx', authContent);

// UserProfilePage
let userContent = fs.readFileSync('d:/Page_Pulse/frontend/src/pages/UserProfilePage.tsx', 'utf8');
userContent = userContent.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { User, Key, Shield, Database, Activity, SignOut, Copy, Check, Plus, Trash } from '@phosphor-icons/react';");
userContent = userContent.replaceAll('<LogOut', '<SignOut');
userContent = userContent.replaceAll('<Trash2', '<Trash');
fs.writeFileSync('d:/Page_Pulse/frontend/src/pages/UserProfilePage.tsx', userContent);

// LandingPage
let landContent = fs.readFileSync('d:/Page_Pulse/frontend/src/pages/LandingPage.tsx', 'utf8');
landContent = landContent.replace(/import \{[\s\S]*?\} from 'lucide-react';/, "import { Lightning, HardDrives, GitBranch, Users, ArrowRight, Activity, ChartBar, FileText, Clock, CheckCircle } from '@phosphor-icons/react';");
landContent = landContent.replaceAll('<Zap', '<Lightning');
landContent = landContent.replaceAll('<Server', '<HardDrives');
landContent = landContent.replaceAll('<BarChart3', '<ChartBar');
landContent = landContent.replaceAll('<CheckCircle2', '<CheckCircle');
fs.writeFileSync('d:/Page_Pulse/frontend/src/pages/LandingPage.tsx', landContent);
