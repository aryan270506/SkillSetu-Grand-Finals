import React from 'react';
import { colors } from '../theme';

// Explicit per-icon imports keep the bundle small (Metro does not tree-shake).
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import AudioLines from 'lucide-react-native/icons/audio-lines';
import Award from 'lucide-react-native/icons/award';
import Bell from 'lucide-react-native/icons/bell';
import BookOpen from 'lucide-react-native/icons/book-open';
import Bookmark from 'lucide-react-native/icons/bookmark';
import Bot from 'lucide-react-native/icons/bot';
import Brain from 'lucide-react-native/icons/brain';
import Briefcase from 'lucide-react-native/icons/briefcase';
import Building from 'lucide-react-native/icons/building';
import Calendar from 'lucide-react-native/icons/calendar';
import ChartColumn from 'lucide-react-native/icons/chart-column';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Circle from 'lucide-react-native/icons/circle';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import Clock from 'lucide-react-native/icons/clock';
import Code from 'lucide-react-native/icons/code';
import Download from 'lucide-react-native/icons/download';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import ExternalLink from 'lucide-react-native/icons/external-link';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import FileText from 'lucide-react-native/icons/file-text';
import Flame from 'lucide-react-native/icons/flame';
import Funnel from 'lucide-react-native/icons/funnel';
import GitBranch from 'lucide-react-native/icons/git-branch';
import Globe from 'lucide-react-native/icons/globe';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import House from 'lucide-react-native/icons/house';
import Inbox from 'lucide-react-native/icons/inbox';
import Info from 'lucide-react-native/icons/info';
import LayoutDashboard from 'lucide-react-native/icons/layout-dashboard';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Link from 'lucide-react-native/icons/link';
import List from 'lucide-react-native/icons/list';
import Lock from 'lucide-react-native/icons/lock';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import MapPin from 'lucide-react-native/icons/map-pin';
import Menu from 'lucide-react-native/icons/menu';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Mic from 'lucide-react-native/icons/mic';
import Minus from 'lucide-react-native/icons/minus';
import Pencil from 'lucide-react-native/icons/pencil';
import Phone from 'lucide-react-native/icons/phone';
import Pin from 'lucide-react-native/icons/pin';
import Play from 'lucide-react-native/icons/play';
import Plus from 'lucide-react-native/icons/plus';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Rocket from 'lucide-react-native/icons/rocket';
import Route from 'lucide-react-native/icons/route';
import Search from 'lucide-react-native/icons/search';
import Send from 'lucide-react-native/icons/send';
import Settings from 'lucide-react-native/icons/settings';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Sprout from 'lucide-react-native/icons/sprout';
import Star from 'lucide-react-native/icons/star';
import Target from 'lucide-react-native/icons/target';
import Trash from 'lucide-react-native/icons/trash';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import Upload from 'lucide-react-native/icons/upload';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
import Video from 'lucide-react-native/icons/video';
import Wallet from 'lucide-react-native/icons/wallet';
import X from 'lucide-react-native/icons/x';
import Zap from 'lucide-react-native/icons/zap';

const ICONS = {
  ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, Award, Bell, BookOpen, Bookmark, Bot, Brain,
  Briefcase, Building, Calendar, ChartColumn, Check, ChevronDown, ChevronLeft, ChevronRight, Circle,
  CircleAlert, CircleCheck, Clock, Code, Download, Ellipsis, ExternalLink, Eye, EyeOff, FileText,
  Flame, Funnel, GitBranch, Globe, GraduationCap, House, Inbox, Info, LayoutDashboard, LayoutGrid,
  Link, List, Lock, LogOut, Mail, MapPin, Menu, MessageCircle, Mic, Minus, Pencil, Phone, Pin, Play,
  Plus, RefreshCw, Rocket, Route, Search, Send, Settings, ShieldCheck, Sparkles, Sprout, Star, Target,
  Trash, TrendingUp, Upload, User, Users, Video, Wallet, X, Zap,
};

export default function Icon({ name, size = 18, color = colors.text, strokeWidth = 2, fill, style }) {
  const Component = ICONS[name] || Circle;
  return <Component size={size} color={color} strokeWidth={strokeWidth} fill={fill || 'none'} style={style} />;
}
