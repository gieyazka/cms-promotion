import {
  Activity, AlertCircle, AlertTriangle, Award, BadgeCheck, Banknote, BarChart3,
  Book, BookOpen, Calculator, Calendar, CheckCircle2, Clock, Coins, CreditCard,
  Database, Eye, FileCheck, FileText, Flame, Gift, Globe, HandCoins, Headphones,
  Landmark, Layers, Lightbulb, ListChecks, Lock, Mail, Percent, PieChart, Repeat,
  Rocket, Scale, ShieldCheck, Sparkles, Star, Target, Timer, TrendingDown,
  TrendingUp, Trophy, User, Users, Wallet, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * The icon set offered by the block icon picker. The prototype used a proprietary
 * "Iconora" set; these are the closest lucide equivalents, kept to the same 48 slots.
 */
export const ICON_SET: Record<string, LucideIcon> = {
  HandCoins, Coins, Wallet, Banknote, CreditCard, Percent, Gift, Landmark,
  BarChart3, TrendingUp, TrendingDown, PieChart, Activity, Calculator, Scale, Target,
  CheckCircle2, BadgeCheck, ListChecks, FileCheck, ShieldCheck, Lock, Eye, Database,
  Trophy, Award, Star, Flame, Rocket, Zap, Sparkles, Layers,
  FileText, Book, BookOpen, Globe, Lightbulb, Wrench, Repeat, Timer,
  Clock, Calendar, Mail, Headphones, User, Users, AlertCircle, AlertTriangle,
};

export const ICON_NAMES = Object.keys(ICON_SET);

export const DEFAULT_ICON = 'HandCoins';

/** Never throws on unknown names — an article authored against an older set still renders. */
export function getIcon(name: string | undefined): LucideIcon {
  return (name && ICON_SET[name]) || ICON_SET[DEFAULT_ICON];
}
