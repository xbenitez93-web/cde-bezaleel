import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme, COLOR_PALETTES } from '../context/ThemeContext';
import { Section, Teacher, Student, UserRole, User, AttendanceStatus, ColorPaletteId } from '../types';
import { getDeduplicatedAttendance, getLocalDateString } from '../utils/attendanceUtils';
import {
  Users,
  GraduationCap,
  School,
  Plus,
  Trash2,
  Edit2,
  X,
  Shield,
  Search,
  CheckCircle2,
  Key,
  Eye,
  EyeOff,
  UserCheck,
  ChefHat,
  Camera,
  Upload,
  User as UserIcon,
  RotateCcw,
  Image as ImageIcon,
  Calendar,
  Clock,
  XCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  Palette,
  Check
} from 'lucide-react';

export const AdminManagementView: React.FC = () => {
  const {
    currentUser,
    sections,
    addSection,
    updateSection,
    deleteSection,
    teachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    students,
    addStudent,
    updateStudent,
    deleteStudent,
    allUsers,
    addUser,
    updateUser,
    updateUserRole,
    deleteUser,
    attendance,
    recordAttendance
  } = useApp();

  const { currentPalette } = useTheme();

  const [activeTab, setActiveTab] = useState<'users' | 'sections' | 'teachers' | 'students' | 'attendance'>('users');
  const [searchTerm, setSearchTerm] = useState('');

  // ATTENDANCE TAB STATE
  const [adminAttendanceDate, setAdminAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adminSelectedSectionId, setAdminSelectedSectionId] = useState<string>('todas');
  const [adminLocalStatusMap, setAdminLocalStatusMap] = useState<Record<string, { status: AttendanceStatus; notes?: string }>>({});

  // Sync admin attendance state when date, section, attendance or students change
  useEffect(() => {
    const activeSts = students.filter(s => s.active && (adminSelectedSectionId === 'todas' || s.sectionId === adminSelectedSectionId));
    const recs = getDeduplicatedAttendance(attendance).filter(a => a.date === adminAttendanceDate && (adminSelectedSectionId === 'todas' || a.sectionId === adminSelectedSectionId));
    const map: Record<string, { status: AttendanceStatus; notes?: string }> = {};
    activeSts.forEach(s => {
      const rec = recs.find(r => r.studentId === s.id);
      map[s.id] = { status: rec ? rec.status : 'presente', notes: rec?.notes || '' };
    });
    setAdminLocalStatusMap(map);
  }, [adminAttendanceDate, adminSelectedSectionId, attendance, students]);

  const handleAdminStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAdminLocalStatusMap(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleAdminNoteChange = (studentId: string, notes: string) => {
    setAdminLocalStatusMap(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes }
    }));
  };

  const handleAdminMarkAllPresent = () => {
    const activeSts = students.filter(s => s.active && (adminSelectedSectionId === 'todas' || s.sectionId === adminSelectedSectionId));
    const map: Record<string, { status: AttendanceStatus; notes?: string }> = { ...adminLocalStatusMap };
    activeSts.forEach(s => {
      map[s.id] = { status: 'presente', notes: map[s.id]?.notes || '' };
    });
    setAdminLocalStatusMap(map);
  };

  const handleAdminSaveAttendance = () => {
    // Group records by section ID
    const activeSts = students.filter(s => s.active && (adminSelectedSectionId === 'todas' || s.sectionId === adminSelectedSectionId));
    const sectionGroups: Record<string, { studentId: string; status: AttendanceStatus; notes?: string }[]> = {};

    activeSts.forEach(st => {
      const stData = adminLocalStatusMap[st.id] || { status: 'presente', notes: '' };
      if (!sectionGroups[st.sectionId]) sectionGroups[st.sectionId] = [];
      sectionGroups[st.sectionId].push({
        studentId: st.id,
        status: stData.status,
        notes: stData.notes
      });
    });

    Object.entries(sectionGroups).forEach(([secId, recs]) => {
      recordAttendance(adminAttendanceDate, secId, recs);
    });

    alert('¡Asistencia guardada y sincronizada correctamente en la base de datos!');
  };

  // USER MODAL STATE
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    username: string;
    password: string;
    role: UserRole;
    assignedGrade: string;
    avatar: string;
    themePalette: ColorPaletteId;
  }>({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'maestro' as UserRole,
    assignedGrade: '',
    avatar: '',
    themePalette: 'school_blue'
  });
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // CAMERA & FILE UPLOAD FOR USER AVATAR
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError('');
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 400 }, height: { ideal: 400 }, facingMode: 'user' },
        audio: false
      });
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Error abriendo cámara:', err);
      setCameraError('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const minDim = Math.min(video.videoWidth || 320, video.videoHeight || 320);
      const startX = ((video.videoWidth || 320) - minDim) / 2;
      const startY = ((video.videoHeight || 320) - minDim) / 2;
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 320, 320);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setUserForm(prev => ({ ...prev, avatar: dataUrl }));
    }
    stopCamera();
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, 320, 320);
          const resizedUrl = canvas.toDataURL('image/jpeg', 0.85);
          setUserForm(prev => ({ ...prev, avatar: resizedUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // SECTION MODAL STATE
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [secForm, setSecForm] = useState({ name: '', ageGroup: '', capacity: 25, mainTeacherId: '' });

  // TEACHER MODAL STATE
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teachForm, setTeachForm] = useState({ fullName: '', email: '', assignedSectionId: '', active: true });

  // STUDENT MODAL STATE
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studForm, setStudForm] = useState({ fullName: '', age: 3, sectionId: '', tutorName: '', tutorPhone: '', allergies: '', active: true });

  // RESTRICT ACCESS IF NOT ADMIN
  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Acceso Restringido a Administrador
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Solo el <strong>Administrador Principal</strong> de la institución tiene autorización para crear usuarios, asignar credenciales de acceso y gestionar las secciones y personal.
        </p>
        <div className="pt-2 text-[11px] font-semibold text-slate-400">
          Rol actual activo: <span className="uppercase font-bold text-slate-700 dark:text-slate-300">{currentUser.role}</span>
        </div>
      </div>
    );
  }

  // USER HANDLERS
  const handleOpenUserModal = (usr?: User) => {
    stopCamera();
    if (usr) {
      setEditingUser(usr);
      setUserForm({
        name: usr.name,
        email: usr.email,
        username: usr.username || usr.email.split('@')[0] || '',
        password: usr.password || '123',
        role: usr.role,
        assignedGrade: usr.assignedGrade || '',
        avatar: usr.avatar || '',
        themePalette: (usr.themePalette as ColorPaletteId) || 'school_blue'
      });
    } else {
      setEditingUser(null);
      setUserForm({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'maestro',
        assignedGrade: '',
        avatar: '',
        themePalette: 'school_blue'
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) return;

    const finalData: Partial<User> & Omit<User, 'id'> = {
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      username: userForm.username.trim() || userForm.email.trim().split('@')[0],
      password: userForm.password.trim() || '123',
      role: userForm.role,
      themePalette: userForm.themePalette || 'school_blue',
      ...(userForm.assignedGrade.trim() ? { assignedGrade: userForm.assignedGrade.trim() } : {}),
      ...(userForm.avatar.trim() ? { avatar: userForm.avatar.trim() } : {})
    };

    if (editingUser) {
      updateUser(editingUser.id, finalData);
    } else {
      addUser(finalData);
    }

    stopCamera();
    setShowUserModal(false);
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // SECTION HANDLERS
  const handleOpenSectionModal = (sec?: Section) => {
    if (sec) {
      setEditingSection(sec);
      setSecForm({ name: sec.name, ageGroup: sec.ageGroup, capacity: sec.capacity, mainTeacherId: sec.mainTeacherId || '' });
    } else {
      setEditingSection(null);
      setSecForm({ name: '', ageGroup: '3 a 4 años', capacity: 25, mainTeacherId: '' });
    }
    setShowSectionModal(true);
  };

  const handleSaveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secForm.name.trim()) return;
    if (editingSection) updateSection(editingSection.id, secForm);
    else addSection(secForm);
    setShowSectionModal(false);
  };

  // TEACHER HANDLERS
  const handleOpenTeacherModal = (teach?: Teacher) => {
    if (teach) {
      setEditingTeacher(teach);
      setTeachForm({ fullName: teach.fullName, email: teach.email, assignedSectionId: teach.assignedSectionId || '', active: teach.active });
    } else {
      setEditingTeacher(null);
      setTeachForm({ fullName: '', email: '', assignedSectionId: sections[0]?.id || '', active: true });
    }
    setShowTeacherModal(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teachForm.fullName.trim()) return;
    if (editingTeacher) updateTeacher(editingTeacher.id, teachForm);
    else addTeacher(teachForm);
    setShowTeacherModal(false);
  };

  // STUDENT HANDLERS
  const handleOpenStudentModal = (stud?: Student) => {
    if (stud) {
      setEditingStudent(stud);
      setStudForm({
        fullName: stud.fullName,
        age: stud.age,
        sectionId: stud.sectionId,
        tutorName: stud.tutorName,
        tutorPhone: stud.tutorPhone,
        allergies: stud.allergies || '',
        active: stud.active
      });
    } else {
      setEditingStudent(null);
      setStudForm({
        fullName: '',
        age: 3,
        sectionId: sections[0]?.id || 'sec-a',
        tutorName: '',
        tutorPhone: '',
        allergies: '',
        active: true
      });
    }
    setShowStudentModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studForm.fullName.trim()) return;
    if (editingStudent) updateStudent(editingStudent.id, studForm);
    else addStudent(studForm);
    setShowStudentModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold text-xs">
              <Shield className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Gestión Administrativa y Estructura Escolar
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administración completa de Secciones/Aulas, Profesores, Alumnos y Asignación de Roles de usuario
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap p-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Usuarios y Roles ({allUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sections')}
            className={`px-3.5 py-2 rounded-lg transition ${
              activeTab === 'sections'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Secciones ({sections.length})
          </button>

          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-3.5 py-2 rounded-lg transition ${
              activeTab === 'teachers'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Profesores ({teachers.length})
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`px-3.5 py-2 rounded-lg transition ${
              activeTab === 'students'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Alumnos ({students.length})
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition ${
              activeTab === 'attendance'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Asistencia y Pase de Lista</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, correo o sección..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white shadow-xs"
        />
      </div>

      {/* TAB 1: SECCIONES */}
      {activeTab === 'sections' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Grados y Secciones del Plantel
            </h3>
            <button
              onClick={() => handleOpenSectionModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <Plus className="w-4 h-4" /> Nueva Sección
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sections
              .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(sec => {
                const secSts = students.filter(st => st.sectionId === sec.id);
                return (
                  <div
                    key={sec.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {sec.ageGroup}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleOpenSectionModal(sec)} className="p-1 text-slate-400 hover:text-indigo-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteSection(sec.id)} className="p-1 text-slate-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-black text-base text-slate-900 dark:text-white mt-2">{sec.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">Capacidad máxima: {sec.capacity} alumnos</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Inscritos:</span>
                      <strong className="text-slate-900 dark:text-white">{secSts.length} alumnos</strong>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 2: PROFESORES */}
      {activeTab === 'teachers' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Directorio de Maestros
            </h3>
            <button
              onClick={() => handleOpenTeacherModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <Plus className="w-4 h-4" /> Nuevo Profesor
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {teachers
              .filter(t => t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || t.email.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(t => {
                const sec = sections.find(s => s.id === t.assignedSectionId);
                return (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0">
                        {t.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{t.fullName}</h4>
                        <p className="text-slate-500">{t.email} • Sección: <strong className="text-slate-700 dark:text-slate-300">{sec?.name || 'Sin Asignar'}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenTeacherModal(t)} className="p-1.5 text-slate-400 hover:text-indigo-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteTeacher(t.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: ALUMNOS */}
      {activeTab === 'students' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Expediente de Alumnos
            </h3>
            <button
              onClick={() => handleOpenStudentModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <Plus className="w-4 h-4" /> Registrar Alumno
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {students
              .filter(st => st.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || st.tutorName.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(st => {
                const sec = sections.find(s => s.id === st.sectionId);
                const todayStr = getLocalDateString();
                const todayRec = getDeduplicatedAttendance(attendance).find(a => a.date === todayStr && a.studentId === st.id);
                const currentStatus: AttendanceStatus | 'sin_registro' = todayRec ? todayRec.status : 'sin_registro';

                return (
                  <div key={st.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{st.fullName}</h4>
                        <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase ${
                          currentStatus === 'presente' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          currentStatus === 'ausente' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          currentStatus === 'retardo' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          currentStatus === 'justificado' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {currentStatus === 'sin_registro' ? 'Sin pase de lista hoy' : `Hoy: ${currentStatus}`}
                        </span>
                      </div>
                      <p className="text-slate-500">
                        Sección: <strong className="text-slate-700 dark:text-slate-300">{sec?.name || 'Sin asignación'}</strong> ({st.age} años) | Tutor: {st.tutorName} ({st.tutorPhone})
                        {st.allergies && <span className="text-amber-600 dark:text-amber-400 font-semibold ml-2">⚠ {st.allergies}</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Quick Status Buttons for Admin */}
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900">
                        {(['presente', 'ausente', 'retardo', 'justificado'] as AttendanceStatus[]).map(stt => (
                          <button
                            key={stt}
                            onClick={() => recordAttendance(todayStr, st.sectionId, [{ studentId: st.id, status: stt }])}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize transition ${
                              currentStatus === stt
                                ? stt === 'presente' ? 'bg-emerald-600 text-white shadow-xs' :
                                  stt === 'ausente' ? 'bg-rose-600 text-white shadow-xs' :
                                  stt === 'retardo' ? 'bg-amber-500 text-white shadow-xs' :
                                  'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                            }`}
                            title={`Cambiar asistencia a ${stt}`}
                          >
                            {stt.charAt(0).toUpperCase() + stt.slice(1, 4)}
                          </button>
                        ))}
                      </div>

                      <button onClick={() => handleOpenStudentModal(st)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Editar Expediente">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteStudent(st.id)} className="p-1.5 text-slate-400 hover:text-red-600" title="Eliminar Alumno">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 4: USUARIOS Y ROLES (ADMIN ONLY) */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="border-b pb-3 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Gestión Exclusiva de Usuarios y Credenciales (Solo Administrador)
              </h3>
              <p className="text-xs text-slate-500">
                Solo el Administrador tiene autorización para crear usuarios, asignar su usuario y contraseña de acceso, y definir sus roles (Administrador, Maestro, Cocinera).
              </p>
            </div>

            <button
              onClick={() => handleOpenUserModal()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition hover:opacity-90 self-start sm:self-auto shrink-0"
              style={{ backgroundColor: currentPalette.primary }}
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Usuario</span>
            </button>
          </div>

          <div className="space-y-3">
            {allUsers.map(usr => (
              <div
                key={usr.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center overflow-hidden shrink-0 shadow-sm text-base">
                    {usr.avatar ? (
                      <img src={usr.avatar} alt={usr.name} className="w-full h-full object-cover" />
                    ) : (
                      usr.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{usr.name}</h4>
                      {usr.id === currentUser.id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                          (Tú - Admin Activo)
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        usr.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' :
                        usr.role === 'maestro' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      }`}>
                        {usr.role === 'admin' ? 'Administrador' : usr.role === 'maestro' ? 'Maestro' : 'Cocinera'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 font-medium">
                      <span>Correo: <strong className="text-slate-700 dark:text-slate-300">{usr.email}</strong></span>
                      <span>Usuario: <strong className="text-slate-700 dark:text-slate-300">{usr.username || usr.email.split('@')[0]}</strong></span>
                      <span className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200">
                        <Key className="w-3 h-3 text-amber-500" />
                        Clave: {visiblePasswords[usr.id] ? (usr.password || '123') : '••••••••'}
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(usr.id)}
                          className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          title={visiblePasswords[usr.id] ? "Ocultar clave" : "Ver clave"}
                        >
                          {visiblePasswords[usr.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </span>

                      {/* Badge con el color de tema asignado al usuario */}
                      {(() => {
                        const userPal = COLOR_PALETTES[(usr.themePalette as ColorPaletteId) || 'school_blue'] || COLOR_PALETTES.school_blue;
                        return (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            <span className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: userPal.primary }} />
                            <span>Tema: <strong>{userPal.name.split(' (')[0]}</strong></span>
                          </span>
                        );
                      })()}
                    </div>

                    {usr.assignedGrade && (
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        Aula Asignada: {usr.assignedGrade}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500 text-[11px]">Rol:</span>
                    <select
                      value={usr.role}
                      onChange={e => updateUserRole(usr.id, e.target.value as UserRole)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-xs"
                    >
                      <option value="admin">Administrador</option>
                      <option value="maestro">Maestro / Docente</option>
                      <option value="cocinera">Cocinera</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleOpenUserModal(usr)}
                    className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                    title="Editar Credenciales del Usuario"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {usr.id !== currentUser.id && (
                    <button
                      onClick={() => deleteUser(usr.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      title="Eliminar Usuario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CONTROL Y PASE DE ASISTENCIA EN TIEMPO REAL */}
      {activeTab === 'attendance' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 dark:border-slate-700">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Control y Sincronización General de Asistencias
              </h3>
              <p className="text-xs text-slate-500">
                Registra o modifica el estado de asistencia (Presente, Ausente, Retardo, Justificado) de cualquier alumno. Los cambios se sincronizan en tiempo real con la base de datos para Docentes y Cocina.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAdminMarkAllPresent}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 transition"
              >
                Marcar Todos Presentes
              </button>
              <button
                type="button"
                onClick={handleAdminSaveAttendance}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition"
                style={{ backgroundColor: currentPalette.primary }}
              >
                Guardar y Sincronizar Asistencia
              </button>
            </div>
          </div>

          {/* Controls: Date & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha de Asistencia:</label>
              <input
                type="date"
                value={adminAttendanceDate}
                onChange={e => setAdminAttendanceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Filtrar por Sección / Grado:</label>
              <select
                value={adminSelectedSectionId}
                onChange={e => setAdminSelectedSectionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="todas">Todas las Secciones ({sections.length})</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.ageGroup})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Realtime Attendance Summary Cards */}
          {(() => {
            const activeSts = students.filter(s => s.active && (adminSelectedSectionId === 'todas' || s.sectionId === adminSelectedSectionId));
            const pCount = activeSts.filter(s => (adminLocalStatusMap[s.id]?.status || 'presente') === 'presente').length;
            const aCount = activeSts.filter(s => adminLocalStatusMap[s.id]?.status === 'ausente').length;
            const rCount = activeSts.filter(s => adminLocalStatusMap[s.id]?.status === 'retardo').length;
            const jCount = activeSts.filter(s => adminLocalStatusMap[s.id]?.status === 'justificado').length;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Presentes</span>
                    <h4 className="text-xl font-black text-emerald-900 dark:text-emerald-200">{pCount}</h4>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">Ausentes</span>
                    <h4 className="text-xl font-black text-rose-900 dark:text-rose-200">{aCount}</h4>
                  </div>
                  <XCircle className="w-6 h-6 text-rose-600" />
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Retardos</span>
                    <h4 className="text-xl font-black text-amber-900 dark:text-amber-200">{rCount}</h4>
                  </div>
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>

                <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase">Justificados</span>
                    <h4 className="text-xl font-black text-sky-900 dark:text-sky-200">{jCount}</h4>
                  </div>
                  <FileText className="w-6 h-6 text-sky-600" />
                </div>
              </div>
            );
          })()}

          {/* Student Roster Table */}
          <div className="space-y-2">
            {students
              .filter(st => st.active && (adminSelectedSectionId === 'todas' || st.sectionId === adminSelectedSectionId))
              .filter(st => st.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(st => {
                const sec = sections.find(s => s.id === st.sectionId);
                const stData = adminLocalStatusMap[st.id] || { status: 'presente', notes: '' };

                return (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{st.fullName}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                          {sec?.name || 'Sin Sección'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Tutor: {st.tutorName} ({st.tutorPhone})
                        {st.allergies && <span className="text-amber-600 dark:text-amber-400 font-bold ml-2">⚠ Alergia: {st.allergies}</span>}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      {/* Status Selector Buttons */}
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleAdminStatusChange(st.id, 'presente')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1 ${
                            stData.status === 'presente'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-emerald-600'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Presente
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAdminStatusChange(st.id, 'ausente')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1 ${
                            stData.status === 'ausente'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-rose-600'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Ausente
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAdminStatusChange(st.id, 'retardo')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1 ${
                            stData.status === 'retardo'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-amber-600'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" /> Retardo
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAdminStatusChange(st.id, 'justificado')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition flex items-center gap-1 ${
                            stData.status === 'justificado'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-sky-600'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" /> Justificado
                        </button>
                      </div>

                      {/* Notes Input */}
                      <input
                        type="text"
                        placeholder="Observación / Motivo..."
                        value={stData.notes || ''}
                        onChange={e => handleAdminNoteChange(st.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 w-full sm:w-44"
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                {editingUser ? 'Editar Credenciales de Usuario' : 'Crear Nuevo Usuario (Solo Admin)'}
              </h3>
              <button onClick={() => { stopCamera(); setShowUserModal(false); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              {/* Photo / Avatar Upload Section */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Fotografía / Foto de Perfil del Usuario:
                </label>

                {/* Camera stream view if camera is active */}
                {isCameraActive ? (
                  <div className="space-y-2 text-center">
                    <div className="relative w-40 h-40 mx-auto rounded-2xl overflow-hidden bg-black border-2 border-indigo-500 shadow-inner">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-md transition"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Capturar Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-1.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-semibold transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Avatar preview */}
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center overflow-hidden shrink-0 shadow-md text-xl relative">
                      {userForm.avatar ? (
                        <img src={userForm.avatar} alt="Foto de perfil" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-8 h-8 text-white/90" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {/* Take photo with camera */}
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Tomar Foto</span>
                        </button>

                        {/* Upload file from device */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1 transition"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Subir Imagen</span>
                        </button>

                        {/* Remove avatar */}
                        {userForm.avatar && (
                          <button
                            type="button"
                            onClick={() => setUserForm(prev => ({ ...prev, avatar: '' }))}
                            className="px-2 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/60 hover:bg-red-200 text-red-600 dark:text-red-400 font-bold transition"
                            title="Quitar foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        className="hidden"
                      />

                      <p className="text-[10px] text-slate-400">
                        Toma una foto en vivo con la cámara o sube un archivo desde tu dispositivo.
                      </p>
                    </div>
                  </div>
                )}

                {cameraError && (
                  <p className="text-[11px] text-red-500 font-bold">{cameraError}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Ej: Lic. María Fernández"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="maria.fernandez@escuela.edu"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre de Usuario:</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="Ej: mfernandez"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contraseña de Acceso:</label>
                  <input
                    type="text"
                    required
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Ej: clave123"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-amber-600 dark:text-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rol Asignado:</label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="admin">Administrador (Control Total)</option>
                  <option value="maestro">Maestro / Docente (Asistencia y Planificador)</option>
                  <option value="cocinera">Cocinera (Menús Nutritivos)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Aula / Sección Asignada (Opcional):</label>
                <select
                  value={userForm.assignedGrade || ''}
                  onChange={e => setUserForm({ ...userForm, assignedGrade: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                >
                  <option value="">-- Sin asignación / General --</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.name}>
                      {sec.name} ({sec.ageGroup})
                    </option>
                  ))}
                  {userForm.assignedGrade && !sections.some(s => s.name === userForm.assignedGrade) && (
                    <option value={userForm.assignedGrade}>{userForm.assignedGrade}</option>
                  )}
                </select>
              </div>

              {/* Selector de Color de Tema / Paleta Personalizada del Usuario */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-indigo-500" />
                    <span>Color de Tema Personalizado para el Usuario:</span>
                  </label>
                  <span
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-xs"
                    style={{ backgroundColor: COLOR_PALETTES[userForm.themePalette]?.primary || '#1e40af' }}
                  >
                    {COLOR_PALETTES[userForm.themePalette]?.name.split(' (')[0] || 'Azul Escolar'}
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-500">
                  Selecciona la paleta de color que se activará automáticamente cuando este usuario inicie sesión:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {Object.values(COLOR_PALETTES).map(pal => {
                    const isSelected = userForm.themePalette === pal.id;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => setUserForm(prev => ({ ...prev, themePalette: pal.id }))}
                        className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 relative ${
                          isSelected
                            ? 'border-2 shadow-sm bg-white dark:bg-slate-800'
                            : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 hover:border-slate-400'
                        }`}
                        style={{
                          borderColor: isSelected ? pal.primary : undefined
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="w-3.5 h-3.5 rounded-full shadow-xs" style={{ backgroundColor: pal.primary }} />
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pal.secondary || pal.accent }} />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pal.accent }} />
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5" style={{ color: pal.primary }} />
                          )}
                        </div>
                        <span className="font-bold text-[10px] text-slate-800 dark:text-slate-200 leading-tight">
                          {pal.name.split(' (')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-white shadow-md transition"
                  style={{ backgroundColor: currentPalette.primary }}
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION MODAL */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingSection ? 'Editar Sección' : 'Nueva Sección'}
              </h3>
              <button onClick={() => setShowSectionModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre de la Sección:</label>
                <input
                  type="text"
                  required
                  value={secForm.name}
                  onChange={e => setSecForm({ ...secForm, name: e.target.value })}
                  placeholder="Ej: Maternal 1 - Párvulos"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rango de Edad:</label>
                <input
                  type="text"
                  required
                  value={secForm.ageGroup}
                  onChange={e => setSecForm({ ...secForm, ageGroup: e.target.value })}
                  placeholder="Ej: 2 a 3 años"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Capacidad Máxima:</label>
                <input
                  type="number"
                  required
                  value={secForm.capacity}
                  onChange={e => setSecForm({ ...secForm, capacity: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
                <button type="button" onClick={() => setShowSectionModal(false)} className="px-3.5 py-2 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl font-bold text-white shadow-md" style={{ backgroundColor: currentPalette.primary }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER MODAL */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingTeacher ? 'Editar Profesor' : 'Nuevo Profesor'}
              </h3>
              <button onClick={() => setShowTeacherModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={teachForm.fullName}
                  onChange={e => setTeachForm({ ...teachForm, fullName: e.target.value })}
                  placeholder="Ej: Lic. Sofía Mendoza"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  required
                  value={teachForm.email}
                  onChange={e => setTeachForm({ ...teachForm, email: e.target.value })}
                  placeholder="sofia@escuela.edu"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sección Asignada:</label>
                <select
                  value={teachForm.assignedSectionId}
                  onChange={e => setTeachForm({ ...teachForm, assignedSectionId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="">Sin Asignar</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
                <button type="button" onClick={() => setShowTeacherModal(false)} className="px-3.5 py-2 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl font-bold text-white shadow-md" style={{ backgroundColor: currentPalette.primary }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT MODAL */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}
              </h3>
              <button onClick={() => setShowStudentModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo del Alumno:</label>
                <input
                  type="text"
                  required
                  value={studForm.fullName}
                  onChange={e => setStudForm({ ...studForm, fullName: e.target.value })}
                  placeholder="Ej: Mateo Ramírez"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Edad (Años):</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={studForm.age}
                    onChange={e => setStudForm({ ...studForm, age: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sección:</label>
                  <select
                    value={studForm.sectionId}
                    onChange={e => setStudForm({ ...studForm, sectionId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    {sections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre del Tutor Responsable:</label>
                <input
                  type="text"
                  required
                  value={studForm.tutorName}
                  onChange={e => setStudForm({ ...studForm, tutorName: e.target.value })}
                  placeholder="Ej: Carlos Ramírez"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Teléfono del Tutor:</label>
                <input
                  type="text"
                  required
                  value={studForm.tutorPhone}
                  onChange={e => setStudForm({ ...studForm, tutorPhone: e.target.value })}
                  placeholder="555-0192"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Alergias o Notas Médicas:</label>
                <input
                  type="text"
                  value={studForm.allergies}
                  onChange={e => setStudForm({ ...studForm, allergies: e.target.value })}
                  placeholder="Ej: Alergia a la nuez / Asma leve"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-700">
                <button type="button" onClick={() => setShowStudentModal(false)} className="px-3.5 py-2 rounded-xl font-semibold bg-slate-200 dark:bg-slate-700">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl font-bold text-white shadow-md" style={{ backgroundColor: currentPalette.primary }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
