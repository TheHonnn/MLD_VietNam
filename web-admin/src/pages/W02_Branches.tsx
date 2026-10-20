// MLD Healthcare & Spa - W02 Branch Management & Facility Configuration
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Building2,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Check,
  X,
  Loader2,
  DoorOpen,
  Image as ImageIcon,
  Settings,
  Trash2,
  ExternalLink,
  Bed,
  CheckCircle2,
  AlertCircle,
  Search,
  Archive,
  RotateCcw,
  Info,
  ShieldCheck,
  Copy,
  RefreshCw,
  Eye,
  Pencil,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { branchService, treatmentService } from '../services';
import { toast } from '../components/common';
import { Branch, BranchRoom, Service, RoomType } from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';
import { VIETNAM_LOCATIONS_2026, VIETNAM_PROVINCE_NAMES } from '../data/vietnamLocations';

const roomTypeLabels: Record<string, string> = {
  VIP_ROOM: 'Phòng VIP',
  MASSAGE_ROOM: 'Phòng Massage',
  HEAD_SPA_ROOM: 'Phòng Gội đầu dưỡng sinh',
  SKINCARE_ROOM: 'Phòng Skincare',
  ACADEMY_CLASSROOM: 'Lớp học lý thuyết',
  PRACTICE_LAB: 'Phòng thực hành',
};

const getRoomTypeBadgeStyle = (type: string) => {
  switch (type) {
    case 'VIP_ROOM':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'MASSAGE_ROOM':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'HEAD_SPA_ROOM':
      return 'bg-cyan-50 text-cyan-800 border-cyan-200';
    case 'SKINCARE_ROOM':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'ACADEMY_CLASSROOM':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'PRACTICE_LAB':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    default:
      return 'bg-[#FAF0E4] text-[#8A4F23] border-[#E8DACB]';
  }
};

export const W02_Branches: React.FC = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('b-q3');
  const [globalWorkingBranchId, setGlobalWorkingBranchId] = useState<string>(() => {
    return localStorage.getItem('mld_selected_branch_id') || '';
  });
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic Pagination State for Branches & Rooms tables (with persistent page size preference)
  const [branchPage, setBranchPage] = useState<number>(1);
  const [branchPageSize, setBranchPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('mld_branch_pagesize');
    return saved ? Number(saved) : 25;
  });
  const [roomPage, setRoomPage] = useState<number>(1);
  const [roomPageSize, setRoomPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('mld_room_pagesize');
    return saved ? Number(saved) : 25;
  });

  // Table Column Sorting States
  const [branchSortField, setBranchSortField] = useState<'name' | 'code' | 'city' | 'status' | null>(null);
  const [branchSortOrder, setBranchSortOrder] = useState<'asc' | 'desc'>('asc');
  const [roomSortField, setRoomSortField] = useState<'name' | 'branch' | 'roomType' | 'bedCapacity' | 'status' | null>(null);
  const [roomSortOrder, setRoomSortOrder] = useState<'asc' | 'desc'>('asc');

  // Main Top-level Tabs: 'branches' (Chi nhánh) vs 'rooms' (Phòng dịch vụ)
  const [activeMainTab, setActiveMainTab] = useState<'branches' | 'rooms'>('branches');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // All Rooms Across System (Tab 'Phòng dịch vụ')
  const [allRooms, setAllRooms] = useState<(BranchRoom & { branchName?: string; branchCode?: string })[]>([]);
  const [allArchivedRooms, setAllArchivedRooms] = useState<(BranchRoom & { branchName?: string; branchCode?: string })[]>([]);
  const [roomSearchTerm, setRoomSearchTerm] = useState('');
  const [selectedRoomBranch, setSelectedRoomBranch] = useState('ALL');
  const [selectedRoomType, setSelectedRoomType] = useState('ALL');
  const [selectedRoomAvailability, setSelectedRoomAvailability] = useState('ALL');
  const [showAllArchivedDrawer, setShowAllArchivedDrawer] = useState(false);

  // Cross-Branch Create Room Modal
  const [isCrossBranchCreateRoomOpen, setIsCrossBranchCreateRoomOpen] = useState(false);
  const [isCrossBranchCreatingRoom, setIsCrossBranchCreatingRoom] = useState(false);
  const [crossBranchCreateRoomForm, setCrossBranchCreateRoomForm] = useState<{
    branchId: string;
    name: string;
    roomType: RoomType | '';
    bedCapacity: number | '';
    isAvailable: boolean;
  }>({
    branchId: '',
    name: '',
    roomType: '',
    bedCapacity: '',
    isAvailable: true,
  });

  // Cross-Branch Edit Room Modal
  const [isCrossBranchEditRoomOpen, setIsCrossBranchEditRoomOpen] = useState(false);
  const [isCrossBranchEditingRoom, setIsCrossBranchEditingRoom] = useState(false);
  const [editingCrossBranchRoom, setEditingCrossBranchRoom] = useState<
    (BranchRoom & { branchName?: string; branchCode?: string }) | null
  >(null);
  const [crossBranchEditRoomForm, setCrossBranchEditRoomForm] = useState<{
    branchId: string;
    name: string;
    roomType: RoomType | '';
    bedCapacity: number | '';
    isAvailable: boolean;
  }>({
    branchId: '',
    name: '',
    roomType: '',
    bedCapacity: '',
    isAvailable: true,
  });

  // Cross-Branch View Room Modal
  const [isCrossBranchViewRoomOpen, setIsCrossBranchViewRoomOpen] = useState(false);
  const [viewingCrossBranchRoom, setViewingCrossBranchRoom] = useState<
    (BranchRoom & { branchName?: string; branchCode?: string }) | null
  >(null);

  // Archived Branches (Soft-deleted branches)
  const [allArchivedBranches, setAllArchivedBranches] = useState<Branch[]>([]);
  const [showArchivedBranchesDrawer, setShowArchivedBranchesDrawer] = useState(false);

  // Delete Branch Modal State
  const [isDeleteBranchModalOpen, setIsDeleteBranchModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  // Delete Room Modal State (Soft-delete confirmation modal)
  const [isDeleteRoomModalOpen, setIsDeleteRoomModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<
    (BranchRoom & { branchName?: string; branchCode?: string }) | null
  >(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  // Create Branch Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manage Branch Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [managingBranch, setManagingBranch] = useState<Branch | null>(null);
  const [activeManageTab, setActiveManageTab] = useState<'info' | 'rooms' | 'actions'>('info');
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [manageRooms, setManageRooms] = useState<BranchRoom[]>([]);
  const [archivedRooms, setArchivedRooms] = useState<BranchRoom[]>([]);
  const [showArchivedRooms, setShowArchivedRooms] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomData, setNewRoomData] = useState<{
    name: string;
    roomType: RoomType | '';
    bedCapacity: number | '';
    isAvailable: boolean;
  }>({
    name: '',
    roomType: '',
    bedCapacity: '',
    isAvailable: true,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    phone: '',
    address: '',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    openingTime: '08:30',
    closingTime: '20:30',
    imageUrl: '',
    isActive: true,
    amenities: [] as string[],
  });

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    address: '',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    openingTime: '08:30',
    closingTime: '20:30',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
    amenities: ['Phòng VIP riêng biệt', 'Đỗ xe ô tô miễn phí', 'Trà thảo mộc & bánh ngọt'],
  });

  const availableAmenities = [
    'Phòng VIP riêng biệt',
    'Đỗ xe ô tô miễn phí',
    'Trà thảo mộc & bánh ngọt',
    'Phòng xông hơi đá muối',
    'Thanh toán VietQR & Thẻ VIP',
    'Học viện đào tạo chuyên sâu',
  ];

  const [isCustomDistrict, setIsCustomDistrict] = useState(false);
  const [isCustomEditDistrict, setIsCustomEditDistrict] = useState(false);

  const cityOptions = VIETNAM_PROVINCE_NAMES;

  const handleCityChange = (newCity: string) => {
    const districts = VIETNAM_LOCATIONS_2026[newCity] || [];
    const defaultDistrict = districts[0] || '';
    setFormData((prev) => ({
      ...prev,
      city: newCity,
      district: defaultDistrict,
    }));
    setIsCustomDistrict(false);
  };

  const handleEditCityChange = (newCity: string) => {
    const districts = VIETNAM_LOCATIONS_2026[newCity] || [];
    const defaultDistrict = districts.includes(editForm.district)
      ? editForm.district
      : districts[0] || '';
    setEditForm((prev) => ({
      ...prev,
      city: newCity,
      district: defaultDistrict,
    }));
    setIsCustomEditDistrict(false);
  };

  const loadAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const [brRes, srvRes, allRoomsRes, archivedRoomsRes, archivedBrRes] = await Promise.all([
        branchService.getAllBranches(),
        treatmentService.getServices(),
        branchService.getAllRooms(),
        branchService.getAllArchivedRooms(),
        branchService.getArchivedBranches(),
      ]);

      let allBranches = brRes.success && brRes.data.length > 0 ? brRes.data : [];
      let archivedBranchesList: Branch[] =
        archivedBrRes.success && archivedBrRes.data.length > 0 ? archivedBrRes.data : [];

      // Merge with local storage branches
      try {
        const storedArchived = localStorage.getItem('mld_archived_custom_branches');
        const archivedIds = new Set(archivedBranchesList.map((b) => b.id));
        if (storedArchived) {
          const parsedArchived: Branch[] = JSON.parse(storedArchived);
          for (const ab of parsedArchived) {
            if (!archivedIds.has(ab.id)) {
              archivedBranchesList.push(ab);
              archivedIds.add(ab.id);
            }
          }
        }

        const stored = localStorage.getItem('mld_custom_branches');
        if (stored) {
          const parsed: Branch[] = JSON.parse(stored);
          const remoteIds = new Set(allBranches.map((b) => b.id));
          const newCustom = parsed.filter(
            (b) => !remoteIds.has(b.id) && !archivedIds.has(b.id)
          );
          allBranches = [...newCustom, ...allBranches];
        }
      } catch {}

      setBranches(allBranches);
      setAllArchivedBranches(archivedBranchesList);

      // 1. Join archived rooms with branch info first to establish exclusion set
      let combinedArchived: (BranchRoom & { branchName?: string; branchCode?: string })[] = [];
      if (archivedRoomsRes.success && archivedRoomsRes.data) {
        combinedArchived = archivedRoomsRes.data.map((r) => {
          const b = allBranches.find((item) => item.id === r.branchId);
          return {
            ...r,
            branchName: b?.name || 'Cơ sở MLD',
            branchCode: b?.code || '',
          };
        });
      }
      setAllArchivedRooms(combinedArchived);
      const archivedRoomIds = new Set(combinedArchived.map((ar) => ar.id));

      // 2. Join active rooms with branch info, excluding archived entries
      let combinedRooms: (BranchRoom & { branchName?: string; branchCode?: string })[] = [];
      if (allRoomsRes.success && allRoomsRes.data) {
        combinedRooms = allRoomsRes.data
          .filter((r) => !archivedRoomIds.has(r.id) && !r.isArchived)
          .map((r) => {
            const b = allBranches.find((item) => item.id === r.branchId);
            return {
              ...r,
              branchName: b?.name || 'Cơ sở MLD',
              branchCode: b?.code || '',
            };
          });
      }

      // 3. Merge cached local rooms safely
      for (const b of allBranches) {
        const cached = localStorage.getItem(`mld_rooms_${b.id}`);
        if (cached) {
          try {
            const parsed: BranchRoom[] = JSON.parse(cached);
            for (const lr of parsed) {
              const isLegacyFake =
                lr.id.match(/^r-.*-[123]$/) &&
                (lr.name === 'Phòng VIP Hoàng Gia' ||
                  lr.name === 'Phòng Trị Liệu Vodder 01' ||
                  lr.name === 'Phòng Skincare Hydrafacial');
              if (
                !combinedRooms.some((cr) => cr.id === lr.id) &&
                !isLegacyFake &&
                !archivedRoomIds.has(lr.id) &&
                !lr.isArchived
              ) {
                combinedRooms.push({
                  ...lr,
                  branchName: b.name,
                  branchCode: b.code,
                });
              }
            }
          } catch {}
        }
      }
      setAllRooms(combinedRooms);

      if (allBranches.length > 0) {
        const savedPref = localStorage.getItem('mld_selected_branch_id');
        const targetId =
          savedPref && savedPref !== 'ALL' && allBranches.some((b) => b.id === savedPref)
            ? savedPref
            : allBranches[0].id;
        setSelectedBranchId(targetId);
        if (savedPref === 'ALL') {
          setGlobalWorkingBranchId('ALL');
        } else if (savedPref && allBranches.some((b) => b.id === savedPref)) {
          setGlobalWorkingBranchId(savedPref);
        } else {
          setGlobalWorkingBranchId('ALL');
        }
      }
      if (srvRes.success) setServices(srvRes.data);

      if (isManualRefresh) {
        toast.success(
          'Đã làm mới dữ liệu',
          'Danh mục chi nhánh và phòng dịch vụ đã được đồng bộ trực tiếp từ Supabase Cloud.'
        );
      }
    } catch (err) {
      console.error('Failed to load branches & rooms:', err);
      if (isManualRefresh) {
        toast.error('Lỗi làm mới', 'Không thể đồng bộ dữ liệu vào lúc này.');
      }
    } finally {
      setIsLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();

    const handleGlobalBranchChange = (e: any) => {
      const bId = e?.detail?.branchId;
      if (bId) {
        setGlobalWorkingBranchId(bId);
      }
    };
    window.addEventListener('mld_branch_changed' as any, handleGlobalBranchChange);
    return () => {
      window.removeEventListener('mld_branch_changed' as any, handleGlobalBranchChange);
    };
  }, []);

  // Global Escape key listener to dismiss topmost active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDeleteRoomModalOpen && !isDeletingRoom) {
          setIsDeleteRoomModalOpen(false);
          setRoomToDelete(null);
        } else if (isDeleteBranchModalOpen && !isDeletingBranch) {
          setIsDeleteBranchModalOpen(false);
          setBranchToDelete(null);
        } else if (isCrossBranchViewRoomOpen) {
          setIsCrossBranchViewRoomOpen(false);
          setViewingCrossBranchRoom(null);
        } else if (isCrossBranchEditRoomOpen && !isCrossBranchEditingRoom) {
          setIsCrossBranchEditRoomOpen(false);
          setEditingCrossBranchRoom(null);
        } else if (isCrossBranchCreateRoomOpen && !isCrossBranchCreatingRoom) {
          setIsCrossBranchCreateRoomOpen(false);
        } else if (isManageModalOpen && !isSavingBranch) {
          setIsManageModalOpen(false);
        } else if (isCreateModalOpen && !isSubmitting) {
          setIsCreateModalOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isDeleteRoomModalOpen,
    isDeletingRoom,
    isDeleteBranchModalOpen,
    isDeletingBranch,
    isCrossBranchViewRoomOpen,
    isCrossBranchEditRoomOpen,
    isCrossBranchEditingRoom,
    isCrossBranchCreateRoomOpen,
    isCrossBranchCreatingRoom,
    isManageModalOpen,
    isSavingBranch,
    isCreateModalOpen,
    isSubmitting,
  ]);

  // Toggle availability of room in cross-branch view
  const handleToggleCrossBranchRoomAvailability = async (
    room: BranchRoom & { branchName?: string }
  ) => {
    const nextAvail = !room.isAvailable;
    setAllRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, isAvailable: nextAvail } : r))
    );

    try {
      const cached = localStorage.getItem(`mld_rooms_${room.branchId}`);
      if (cached) {
        const parsed: BranchRoom[] = JSON.parse(cached);
        const updated = parsed.map((r) =>
          r.id === room.id ? { ...r, isAvailable: nextAvail } : r
        );
        localStorage.setItem(`mld_rooms_${room.branchId}`, JSON.stringify(updated));
      }
    } catch {}

    if (managingBranch && managingBranch.id === room.branchId) {
      setManageRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, isAvailable: nextAvail } : r))
      );
    }

    toast.info(
      'Cập nhật trạng thái phòng',
      `Phòng "${room.name}" hiện ${nextAvail ? 'sẵn sàng đón khách' : 'tạm dừng nhận khách'}.`
    );

    await branchService.updateRoom(room.id, { isAvailable: nextAvail });
  };

  // Open Room Deletion Confirmation Modal (Soft delete with branded dialog)
  const handleOpenDeleteRoomModal = (
    room: BranchRoom & { branchName?: string; branchCode?: string }
  ) => {
    const resolvedBranch = branches.find((b) => b.id === room.branchId) || managingBranch;
    setRoomToDelete({
      ...room,
      branchName: room.branchName || resolvedBranch?.name || 'Cơ sở MLD',
      branchCode: room.branchCode || resolvedBranch?.code || '',
    });
    setIsDeleteRoomModalOpen(true);
  };

  const handleDeleteCrossBranchRoom = (
    room: BranchRoom & { branchName?: string; branchCode?: string }
  ) => {
    handleOpenDeleteRoomModal(room);
  };

  const handleConfirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    setIsDeletingRoom(true);
    try {
      const room = roomToDelete;

      // 1. Remove from allRooms
      setAllRooms((prev) => prev.filter((r) => r.id !== room.id));

      // 2. Add to allArchivedRooms
      const archivedItem: BranchRoom & { branchName?: string; branchCode?: string } = {
        ...room,
        isAvailable: false,
        isArchived: true,
        archivedAt: new Date().toISOString(),
      };
      setAllArchivedRooms((prev) => [archivedItem, ...prev.filter((r) => r.id !== room.id)]);

      // 3. Update localStorage
      try {
        const cached = localStorage.getItem(`mld_rooms_${room.branchId}`);
        if (cached) {
          const parsed: BranchRoom[] = JSON.parse(cached);
          localStorage.setItem(
            `mld_rooms_${room.branchId}`,
            JSON.stringify(parsed.filter((r) => r.id !== room.id))
          );
        }
      } catch {}

      // 4. Update manage modal rooms if managing this branch
      if (managingBranch && managingBranch.id === room.branchId) {
        setManageRooms((prev) => prev.filter((r) => r.id !== room.id));
        setArchivedRooms((prev) => [archivedItem, ...prev.filter((r) => r.id !== room.id)]);
      }

      toast.success(
        'Đã xóa phòng khỏi hệ thống',
        `Phòng "${room.name}" đã được ẩn khỏi hệ thống vận hành. Bản ghi vẫn được bảo toàn nguyên vẹn trong cơ sở dữ liệu.`
      );

      setIsDeleteRoomModalOpen(false);
      setRoomToDelete(null);

      // 5. Update Supabase Cloud (PATCH [ARCHIVED])
      await branchService.deleteRoom(room.id);
    } catch (err) {
      console.error('Failed to delete room:', err);
      toast.error('Lỗi khi xóa phòng', 'Không thể hoàn tất thao tác xóa phòng.');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  // Restore archived room in cross-branch view
  const handleRestoreCrossBranchRoom = async (
    room: BranchRoom & { branchName?: string }
  ) => {
    // 1. Remove from allArchivedRooms
    setAllArchivedRooms((prev) => prev.filter((r) => r.id !== room.id));

    // 2. Add back to allRooms
    const restoredItem: BranchRoom & { branchName?: string; branchCode?: string } = {
      ...room,
      isAvailable: true,
      isArchived: false,
    };
    setAllRooms((prev) => [restoredItem, ...prev.filter((r) => r.id !== room.id)]);

    // 3. Update localStorage
    try {
      const cached = localStorage.getItem(`mld_rooms_${room.branchId}`);
      const parsed: BranchRoom[] = cached ? JSON.parse(cached) : [];
      localStorage.setItem(
        `mld_rooms_${room.branchId}`,
        JSON.stringify([
          ...parsed.filter((r) => r.id !== room.id),
          {
            id: room.id,
            branchId: room.branchId,
            name: room.name,
            roomType: room.roomType,
            bedCapacity: room.bedCapacity,
            isAvailable: true,
            isArchived: false,
            createdAt: room.createdAt,
          },
        ])
      );
    } catch {}

    // 4. Update manage modal rooms if managing this branch
    if (managingBranch && managingBranch.id === room.branchId) {
      setArchivedRooms((prev) => prev.filter((r) => r.id !== room.id));
      setManageRooms((prev) => [...prev.filter((r) => r.id !== room.id), restoredItem]);
    }

    toast.success(
      'Khôi phục thành công',
      `Phòng "${room.name}" đã được khôi phục trở lại hệ thống vận hành.`
    );

    await branchService.restoreRoom(room.id);
  };

  // Open cross-branch create room modal
  const handleOpenCrossBranchCreateRoom = () => {
    const defaultBranchId =
      (selectedRoomBranch !== 'ALL' && selectedRoomBranch) ||
      (selectedBranchId && branches.some((b) => b.id === selectedBranchId)
        ? selectedBranchId
        : branches[0]?.id || '');

    setCrossBranchCreateRoomForm({
      branchId: defaultBranchId,
      name: '',
      roomType: '',
      bedCapacity: '',
      isAvailable: true,
    });
    setIsCrossBranchCreateRoomOpen(true);
  };

  // Save cross-branch create room
  const handleSaveCrossBranchCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crossBranchCreateRoomForm.branchId) {
      toast.error('Thiếu thông tin', 'Vui lòng chọn cơ sở chi nhánh cho phòng.');
      return;
    }
    if (!crossBranchCreateRoomForm.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên phòng dịch vụ.');
      return;
    }
    if (!crossBranchCreateRoomForm.roomType) {
      toast.error('Thiếu thông tin', 'Vui lòng chọn loại phòng dịch vụ.');
      return;
    }
    if (
      crossBranchCreateRoomForm.bedCapacity === '' ||
      Number(crossBranchCreateRoomForm.bedCapacity) <= 0
    ) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập số giường sức chứa (tối thiểu 1 giường).');
      return;
    }

    setIsCrossBranchCreatingRoom(true);
    try {
      const targetBranch = branches.find((b) => b.id === crossBranchCreateRoomForm.branchId);
      const roomPayload = {
        branchId: crossBranchCreateRoomForm.branchId,
        name: crossBranchCreateRoomForm.name.trim(),
        roomType: crossBranchCreateRoomForm.roomType as RoomType,
        bedCapacity: Number(crossBranchCreateRoomForm.bedCapacity),
        isAvailable: crossBranchCreateRoomForm.isAvailable,
      };

      const res = await branchService.createRoom(roomPayload);
      const createdRoom: BranchRoom = res.data || {
        id: `r-${Date.now()}`,
        ...roomPayload,
        isArchived: false,
        createdAt: new Date().toISOString(),
      };

      const newJoinedRoom: BranchRoom & { branchName?: string; branchCode?: string } = {
        ...createdRoom,
        branchName: targetBranch?.name || 'Cơ sở MLD',
        branchCode: targetBranch?.code || '',
      };

      // Add to allRooms state
      setAllRooms((prev) => [newJoinedRoom, ...prev]);

      // Update localStorage
      try {
        const cached = localStorage.getItem(`mld_rooms_${createdRoom.branchId}`);
        const parsed: BranchRoom[] = cached ? JSON.parse(cached) : [];
        localStorage.setItem(
          `mld_rooms_${createdRoom.branchId}`,
          JSON.stringify([...parsed, createdRoom])
        );
      } catch {}

      if (managingBranch && managingBranch.id === createdRoom.branchId) {
        setManageRooms((prev) => [...prev, createdRoom]);
      }

      toast.success(
        'Thêm phòng thành công',
        `Phòng "${createdRoom.name}" đã được bổ sung vào cơ sở ${targetBranch?.name || ''}.`
      );

      setIsCrossBranchCreateRoomOpen(false);
      setCrossBranchCreateRoomForm({
        branchId: branches[0]?.id || '',
        name: '',
        roomType: '',
        bedCapacity: '',
        isAvailable: true,
      });
    } catch (err) {
      console.error('Lỗi khi thêm phòng:', err);
      toast.error('Có lỗi xảy ra', 'Không thể khởi tạo phòng mới vào lúc này.');
    } finally {
      setIsCrossBranchCreatingRoom(false);
    }
  };

  // Open cross-branch edit room modal
  const handleOpenCrossBranchEditRoom = (
    room: BranchRoom & { branchName?: string; branchCode?: string }
  ) => {
    setEditingCrossBranchRoom(room);
    setCrossBranchEditRoomForm({
      branchId: room.branchId,
      name: room.name,
      roomType: room.roomType,
      bedCapacity: room.bedCapacity,
      isAvailable: room.isAvailable,
    });
    setIsCrossBranchEditRoomOpen(true);
  };

  // Save cross-branch edit room
  const handleSaveCrossBranchEditRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCrossBranchRoom) return;

    if (!crossBranchEditRoomForm.branchId) {
      toast.error('Thiếu thông tin', 'Vui lòng chọn cơ sở chi nhánh cho phòng.');
      return;
    }
    if (!crossBranchEditRoomForm.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên phòng dịch vụ.');
      return;
    }
    if (!crossBranchEditRoomForm.roomType) {
      toast.error('Thiếu thông tin', 'Vui lòng chọn loại phòng dịch vụ.');
      return;
    }
    if (
      crossBranchEditRoomForm.bedCapacity === '' ||
      Number(crossBranchEditRoomForm.bedCapacity) <= 0
    ) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập số giường sức chứa (tối thiểu 1 giường).');
      return;
    }

    setIsCrossBranchEditingRoom(true);
    try {
      const targetBranch = branches.find((b) => b.id === crossBranchEditRoomForm.branchId);
      const updates: Partial<BranchRoom> = {
        branchId: crossBranchEditRoomForm.branchId,
        name: crossBranchEditRoomForm.name.trim(),
        roomType: crossBranchEditRoomForm.roomType as RoomType,
        bedCapacity: Number(crossBranchEditRoomForm.bedCapacity),
        isAvailable: crossBranchEditRoomForm.isAvailable,
      };

      await branchService.updateRoom(editingCrossBranchRoom.id, updates);

      // Update allRooms state
      setAllRooms((prev) =>
        prev.map((r) =>
          r.id === editingCrossBranchRoom.id
            ? {
                ...r,
                ...updates,
                branchName: targetBranch?.name || r.branchName,
                branchCode: targetBranch?.code || r.branchCode,
              }
            : r
        )
      );

      // Update localStorage
      try {
        const oldCached = localStorage.getItem(
          `mld_rooms_${editingCrossBranchRoom.branchId}`
        );
        if (oldCached) {
          const parsed: BranchRoom[] = JSON.parse(oldCached);
          if (editingCrossBranchRoom.branchId !== crossBranchEditRoomForm.branchId) {
            localStorage.setItem(
              `mld_rooms_${editingCrossBranchRoom.branchId}`,
              JSON.stringify(
                parsed.filter((r) => r.id !== editingCrossBranchRoom.id)
              )
            );
            const newCached = localStorage.getItem(
              `mld_rooms_${crossBranchEditRoomForm.branchId}`
            );
            const newParsed: BranchRoom[] = newCached ? JSON.parse(newCached) : [];
            localStorage.setItem(
              `mld_rooms_${crossBranchEditRoomForm.branchId}`,
              JSON.stringify([
                ...newParsed,
                { ...editingCrossBranchRoom, ...updates },
              ])
            );
          } else {
            localStorage.setItem(
              `mld_rooms_${editingCrossBranchRoom.branchId}`,
              JSON.stringify(
                parsed.map((r) =>
                  r.id === editingCrossBranchRoom.id ? { ...r, ...updates } : r
                )
              )
            );
          }
        }
      } catch {}

      if (managingBranch) {
        if (
          managingBranch.id === editingCrossBranchRoom.branchId &&
          editingCrossBranchRoom.branchId !== crossBranchEditRoomForm.branchId
        ) {
          setManageRooms((prev) =>
            prev.filter((r) => r.id !== editingCrossBranchRoom.id)
          );
        } else if (managingBranch.id === crossBranchEditRoomForm.branchId) {
          setManageRooms((prev) => {
            const exists = prev.some((r) => r.id === editingCrossBranchRoom.id);
            if (exists) {
              return prev.map((r) =>
                r.id === editingCrossBranchRoom.id ? { ...r, ...updates } : r
              );
            }
            return [...prev, { ...editingCrossBranchRoom, ...updates } as BranchRoom];
          });
        }
      }

      toast.success(
        'Cập nhật phòng thành công',
        `Phòng "${crossBranchEditRoomForm.name}" đã được lưu thay đổi.`
      );

      setIsCrossBranchEditRoomOpen(false);
      setEditingCrossBranchRoom(null);
    } catch (err) {
      console.error('Lỗi khi cập nhật phòng:', err);
      toast.error('Có lỗi xảy ra', 'Không thể lưu thay đổi vào lúc này.');
    } finally {
      setIsCrossBranchEditingRoom(false);
    }
  };

  // Open cross-branch view room modal
  const handleOpenCrossBranchViewRoom = (
    room: BranchRoom & { branchName?: string; branchCode?: string }
  ) => {
    setViewingCrossBranchRoom(room);
    setIsCrossBranchViewRoomOpen(true);
  };

  // Toggle active status for branch directly from master table
  const handleToggleBranchActive = async (
    branch: Branch,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const nextActive = !branch.isActive;
    const updated = branches.map((b) =>
      b.id === branch.id ? { ...b, isActive: nextActive } : b
    );
    setBranches(updated);

    try {
      const stored = localStorage.getItem('mld_custom_branches');
      if (stored) {
        const parsed: Branch[] = JSON.parse(stored);
        const updatedCustom = parsed.map((b) =>
          b.id === branch.id ? { ...b, isActive: nextActive } : b
        );
        localStorage.setItem('mld_custom_branches', JSON.stringify(updatedCustom));
      }
    } catch {}

    toast.info(
      'Cập nhật cơ sở',
      `Chi nhánh "${branch.name}" hiện ${nextActive ? 'đang hoạt động' : 'tạm dừng hoạt động'}.`
    );

    window.dispatchEvent(new CustomEvent('mld_branches_updated'));
    await branchService.updateBranch(branch.id, { isActive: nextActive });
  };

  // Open Delete Branch confirmation modal
  const handleOpenDeleteBranchModal = (branch: Branch) => {
    setBranchToDelete(branch);
    setIsDeleteBranchModalOpen(true);
  };

  // Confirm delete branch (Soft Delete - preserve in CSDL)
  const handleConfirmDeleteBranch = async () => {
    if (!branchToDelete) return;

    if (branches.length <= 1) {
      toast.error(
        'Không thể xóa',
        'Hệ thống yêu cầu duy trì tối thiểu 01 cơ sở chi nhánh để vận hành lịch hẹn và POS.'
      );
      setIsDeleteBranchModalOpen(false);
      setBranchToDelete(null);
      return;
    }

    setIsDeletingBranch(true);
    const target = branchToDelete;

    try {
      // 1. Remove from active branches state
      const remainingBranches = branches.filter((b) => b.id !== target.id);
      setBranches(remainingBranches);

      // 2. Add to allArchivedBranches state
      const archivedItem: Branch = {
        ...target,
        isActive: false,
        isArchived: true,
        archivedAt: new Date().toISOString(),
      };
      setAllArchivedBranches((prev) => [archivedItem, ...prev.filter((b) => b.id !== target.id)]);

      // Move all rooms of this branch to allArchivedRooms
      const branchRooms = allRooms.filter((r) => r.branchId === target.id);
      if (branchRooms.length > 0) {
        setAllRooms((prev) => prev.filter((r) => r.branchId !== target.id));
        const archivedBranchRooms = branchRooms.map((r) => ({
          ...r,
          isAvailable: false,
          isArchived: true,
          archivedAt: new Date().toISOString(),
        }));
        setAllArchivedRooms((prev) => [
          ...archivedBranchRooms,
          ...prev.filter((r) => r.branchId !== target.id),
        ]);
      }

      // 3. Switch selected branch if it was deleted
      if (selectedBranchId === target.id) {
        const nextBranch = remainingBranches[0];
        if (nextBranch) {
          setSelectedBranchId(nextBranch.id);
        }
      }

      // 4. Switch global working branch if it was deleted
      if (globalWorkingBranchId === target.id) {
        const nextBranch = remainingBranches[0];
        if (nextBranch) {
          setGlobalWorkingBranchId(nextBranch.id);
          localStorage.setItem('mld_selected_branch_id', nextBranch.id);
          window.dispatchEvent(
            new CustomEvent('mld_branch_changed', {
              detail: { branchId: nextBranch.id, branch: nextBranch },
            })
          );
        }
      }

      // 5. Update localStorage
      try {
        const stored = localStorage.getItem('mld_custom_branches');
        if (stored) {
          const parsed: Branch[] = JSON.parse(stored);
          localStorage.setItem(
            'mld_custom_branches',
            JSON.stringify(parsed.filter((b) => b.id !== target.id))
          );
        }
        const storedArchived = localStorage.getItem('mld_archived_custom_branches');
        const parsedArchived: Branch[] = storedArchived ? JSON.parse(storedArchived) : [];
        localStorage.setItem(
          'mld_archived_custom_branches',
          JSON.stringify([archivedItem, ...parsedArchived.filter((b) => b.id !== target.id)])
        );
      } catch {}

      toast.success(
        'Đã xóa chi nhánh khỏi hệ thống',
        `Cơ sở "${target.name}" đã được ẩn khỏi hệ thống vận hành. Bản ghi cơ sở và dữ liệu giao dịch vẫn được bảo toàn nguyên vẹn trong CSDL.`
      );

      setIsDeleteBranchModalOpen(false);
      setBranchToDelete(null);

      window.dispatchEvent(new CustomEvent('mld_branches_updated'));

      // 6. Update Supabase Cloud (PATCH [ARCHIVED])
      await branchService.deleteBranch(target.id);
    } catch (err) {
      console.error('Lỗi khi xóa chi nhánh:', err);
      toast.error('Có lỗi xảy ra', 'Không thể xóa chi nhánh vào lúc này.');
    } finally {
      setIsDeletingBranch(false);
    }
  };

  // Restore archived branch
  const handleRestoreBranch = async (branch: Branch) => {
    // 1. Remove from allArchivedBranches
    setAllArchivedBranches((prev) => prev.filter((b) => b.id !== branch.id));

    // 2. Add back to branches
    const restoredItem: Branch = {
      ...branch,
      isActive: true,
      isArchived: false,
    };
    setBranches((prev) => [...prev.filter((b) => b.id !== branch.id), restoredItem]);

    // 2b. Restore cascade rooms of this branch from allArchivedRooms to allRooms
    const branchArchivedRooms = allArchivedRooms.filter((r) => r.branchId === branch.id);
    if (branchArchivedRooms.length > 0) {
      setAllArchivedRooms((prev) => prev.filter((r) => r.branchId !== branch.id));
      const restoredRooms = branchArchivedRooms.map((r) => ({
        ...r,
        isAvailable: true,
        isArchived: false,
      }));
      setAllRooms((prev) => [...restoredRooms, ...prev.filter((r) => r.branchId !== branch.id)]);
      try {
        localStorage.setItem(`mld_rooms_${branch.id}`, JSON.stringify(restoredRooms));
        const storedArchivedRooms = localStorage.getItem('mld_archived_rooms');
        if (storedArchivedRooms) {
          const parsed = JSON.parse(storedArchivedRooms);
          localStorage.setItem(
            'mld_archived_rooms',
            JSON.stringify(parsed.filter((r: any) => r.branchId !== branch.id))
          );
        }
      } catch {}
    }

    // 3. Update localStorage
    try {
      const storedArchived = localStorage.getItem('mld_archived_custom_branches');
      if (storedArchived) {
        const parsed: Branch[] = JSON.parse(storedArchived);
        localStorage.setItem(
          'mld_archived_custom_branches',
          JSON.stringify(parsed.filter((b) => b.id !== branch.id))
        );
      }
      const stored = localStorage.getItem('mld_custom_branches');
      const parsed: Branch[] = stored ? JSON.parse(stored) : [];
      localStorage.setItem(
        'mld_custom_branches',
        JSON.stringify([...parsed.filter((b) => b.id !== branch.id), restoredItem])
      );
    } catch {}

    toast.success(
      'Khôi phục chi nhánh thành công',
      `Cơ sở "${branch.name}" đã được khôi phục trở lại hệ thống vận hành.`
    );

    window.dispatchEvent(new CustomEvent('mld_branches_updated'));

    // 4. Update Supabase Cloud
    await branchService.restoreBranch(branch.id);
  };

  const handleSetWorkingBranch = (branchId: string, branchName: string) => {
    setGlobalWorkingBranchId(branchId);
    localStorage.setItem('mld_selected_branch_id', branchId);
    window.dispatchEvent(
      new CustomEvent('mld_branch_changed', {
        detail: { branchId },
      })
    );
    toast.success(
      'Đã đổi chi nhánh làm việc',
      `Đã kích hoạt "${branchName}" làm cơ sở làm việc hiện tại trên toàn hệ thống.`
    );
  };

  const handleSelectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
  };

  // Open Manage Modal
  const handleOpenManageModal = async (branch: Branch) => {
    setManagingBranch(branch);
    setEditForm({
      name: branch.name,
      code: branch.code,
      phone: branch.phone,
      address: branch.address,
      district: branch.district,
      city: branch.city,
      openingTime: branch.openingTime ? branch.openingTime.slice(0, 5) : '08:30',
      closingTime: branch.closingTime ? branch.closingTime.slice(0, 5) : '20:30',
      imageUrl: branch.imageUrl || '',
      isActive: branch.isActive !== undefined ? branch.isActive : true,
      amenities: branch.amenities ? [...branch.amenities] : [],
    });

    try {
      const [res, archRes] = await Promise.all([
        branchService.getRoomsByBranch(branch.id),
        branchService.getArchivedRooms(branch.id),
      ]);
      let branchRooms: BranchRoom[] = res.success && res.data.length > 0 ? res.data : [];
      const cached = localStorage.getItem(`mld_rooms_${branch.id}`);
      if (cached) {
        try {
          const localRooms: BranchRoom[] = JSON.parse(cached);
          const liveIds = new Set(branchRooms.map((r) => r.id));
          for (const lr of localRooms) {
            const isLegacyFake =
              lr.id.match(/^r-.*-[123]$/) &&
              (lr.name === 'Phòng VIP Hoàng Gia' ||
                lr.name === 'Phòng Trị Liệu Vodder 01' ||
                lr.name === 'Phòng Skincare Hydrafacial');
            if (!liveIds.has(lr.id) && !isLegacyFake) {
              branchRooms.push(lr);
            }
          }
        } catch {}
      }
      // Giữ đúng trạng thái thực tế: nếu cơ sở chưa có phòng thì để trống, không tự ý chèn dữ liệu mẫu
      setManageRooms(branchRooms);
      setArchivedRooms(archRes.success ? archRes.data : []);
    } catch {
      setManageRooms([]);
      setArchivedRooms([]);
    }

    setShowAddRoom(false);
    setIsManageModalOpen(true);
  };

  const toggleEditAmenity = (amenity: string) => {
    setEditForm((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  // Add Room inside Manage Modal
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingBranch) return;
    if (!newRoomData.name.trim()) {
      toast.error('Thiếu thông tin phòng', 'Vui lòng nhập tên phòng.');
      return;
    }
    if (!newRoomData.roomType) {
      toast.error('Thiếu thông tin phòng', 'Vui lòng chọn loại phòng.');
      return;
    }
    const bedCap = Number(newRoomData.bedCapacity);
    if (!bedCap || bedCap <= 0) {
      toast.error('Thiếu thông tin phòng', 'Vui lòng nhập số giường (tối thiểu 1 giường).');
      return;
    }

    setIsAddingRoom(true);
    const roomType = newRoomData.roomType as RoomType;
    try {
      const res = await branchService.createRoom({
        branchId: managingBranch.id,
        name: newRoomData.name.trim(),
        roomType,
        bedCapacity: bedCap,
        isAvailable: newRoomData.isAvailable,
      });

      const newRoom: BranchRoom = (res.success && res.data)
        ? res.data
        : {
            id: `r-${managingBranch.id}-${Date.now()}`,
            branchId: managingBranch.id,
            name: newRoomData.name.trim(),
            roomType,
            bedCapacity: bedCap,
            isAvailable: newRoomData.isAvailable,
          };

      const updated = [...manageRooms, newRoom];
      setManageRooms(updated);
      localStorage.setItem(`mld_rooms_${managingBranch.id}`, JSON.stringify(updated));
      const joinedNewRoom: BranchRoom & { branchName?: string; branchCode?: string } = {
        ...newRoom,
        branchName: managingBranch.name,
        branchCode: managingBranch.code,
      };
      setAllRooms((prev) => [joinedNewRoom, ...prev.filter((r) => r.id !== newRoom.id)]);
      setNewRoomData({
        name: '',
        roomType: '',
        bedCapacity: '',
        isAvailable: true,
      });
      setShowAddRoom(false);
      toast.success('Đã thêm phòng thành công', `Phòng "${newRoom.name}" (${newRoom.bedCapacity} giường) đã được bổ sung vào cơ sở.`);
    } catch (err) {
      console.error('Lỗi khi thêm phòng:', err);
      const fallbackRoom: BranchRoom = {
        id: `r-${managingBranch.id}-${Date.now()}`,
        branchId: managingBranch.id,
        name: newRoomData.name.trim(),
        roomType,
        bedCapacity: bedCap,
        isAvailable: newRoomData.isAvailable,
      };
      const updated = [...manageRooms, fallbackRoom];
      setManageRooms(updated);
      localStorage.setItem(`mld_rooms_${managingBranch.id}`, JSON.stringify(updated));
      const joinedFallback: BranchRoom & { branchName?: string; branchCode?: string } = {
        ...fallbackRoom,
        branchName: managingBranch.name,
        branchCode: managingBranch.code,
      };
      setAllRooms((prev) => [joinedFallback, ...prev.filter((r) => r.id !== fallbackRoom.id)]);
      setShowAddRoom(false);
      toast.success('Đã thêm phòng', `Phòng "${fallbackRoom.name}" đã được lưu vào cơ sở.`);
    } finally {
      setIsAddingRoom(false);
    }
  };

  const handleToggleRoomAvailability = async (roomId: string) => {
    if (!managingBranch) return;
    const target = manageRooms.find((r) => r.id === roomId);
    if (!target) return;
    const nextAvail = !target.isAvailable;
    const updated = manageRooms.map((r) =>
      r.id === roomId ? { ...r, isAvailable: nextAvail } : r
    );
    setManageRooms(updated);
    localStorage.setItem(`mld_rooms_${managingBranch.id}`, JSON.stringify(updated));
    setAllRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, isAvailable: nextAvail } : r))
    );
    await branchService.updateRoom(roomId, { isAvailable: nextAvail });
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!managingBranch) return;
    const target = manageRooms.find((r) => r.id === roomId);
    if (!target) return;
    handleOpenDeleteRoomModal({
      ...target,
      branchName: managingBranch.name,
      branchCode: managingBranch.code,
    });
  };

  const handleRestoreRoom = async (roomId: string) => {
    if (!managingBranch) return;
    const target = archivedRooms.find((r) => r.id === roomId);
    if (!target) return;

    // 1. Gỡ khỏi danh sách lưu trữ CSDL
    setArchivedRooms((prev) => prev.filter((r) => r.id !== roomId));
    setAllArchivedRooms((prev) => prev.filter((r) => r.id !== roomId));

    // 2. Khôi phục lại danh sách phòng hoạt động trên hệ thống
    const restoredTarget: BranchRoom = {
      ...target,
      isAvailable: true,
      isArchived: false,
    };
    const updated = [...manageRooms, restoredTarget];
    setManageRooms(updated);
    localStorage.setItem(`mld_rooms_${managingBranch.id}`, JSON.stringify(updated));
    const restoredJoined: BranchRoom & { branchName?: string; branchCode?: string } = {
      ...restoredTarget,
      branchName: managingBranch.name,
      branchCode: managingBranch.code,
    };
    setAllRooms((prev) => [restoredJoined, ...prev.filter((r) => r.id !== roomId)]);

    toast.success(
      'Khôi phục thành công',
      `Phòng "${target.name}" đã được khôi phục trở lại hệ thống vận hành.`
    );

    // 3. Cập nhật restore trên Supabase Cloud
    await branchService.restoreRoom(roomId);
  };

  // Save Branch Updates
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingBranch) return;
    if (!editForm.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên chi nhánh.');
      return;
    }
    if (!editForm.phone.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập hotline chi nhánh.');
      return;
    }

    setIsSavingBranch(true);
    try {
      const updates: Partial<Branch> = {
        name: editForm.name.trim(),
        code: editForm.code.trim().toUpperCase(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        district: editForm.district.trim(),
        city: editForm.city.trim(),
        openingTime: `${editForm.openingTime}:00`,
        closingTime: `${editForm.closingTime}:00`,
        imageUrl: editForm.imageUrl || managingBranch.imageUrl,
        isActive: editForm.isActive,
        amenities: editForm.amenities,
      };

      await branchService.updateBranch(managingBranch.id, updates);

      // Update state
      const updatedList = branches.map((b) =>
        b.id === managingBranch.id ? { ...b, ...updates } : b
      );
      setBranches(updatedList);

      // Persist to custom branches
      try {
        const stored = localStorage.getItem('mld_custom_branches');
        const customArr: Branch[] = stored ? JSON.parse(stored) : [];
        const updatedCustom = customArr.map((b) =>
          b.id === managingBranch.id ? { ...b, ...updates } : b
        );
        localStorage.setItem('mld_custom_branches', JSON.stringify(updatedCustom));
      } catch {}

      // Persist rooms
      localStorage.setItem(`mld_rooms_${managingBranch.id}`, JSON.stringify(manageRooms));

      // Sync updated branch name and code across room master lists
      setAllRooms((prev) =>
        prev.map((r) =>
          r.branchId === managingBranch.id
            ? {
                ...r,
                branchName: updates.name || r.branchName,
                branchCode: updates.code || r.branchCode,
              }
            : r
        )
      );
      setAllArchivedRooms((prev) =>
        prev.map((r) =>
          r.branchId === managingBranch.id
            ? {
                ...r,
                branchName: updates.name || r.branchName,
                branchCode: updates.code || r.branchCode,
              }
            : r
        )
      );

      toast.success('Cập nhật cơ sở thành công', `Đã lưu thông tin cơ sở ${editForm.name}.`);
      setIsManageModalOpen(false);
      window.dispatchEvent(new CustomEvent('mld_branches_updated'));
    } catch (err) {
      console.error('Lỗi khi cập nhật chi nhánh:', err);
      toast.error('Có lỗi xảy ra', 'Không thể lưu thay đổi vào lúc này.');
    } finally {
      setIsSavingBranch(false);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      let newCode = prev.code;
      if (!prev.code || prev.code.startsWith('MLD-')) {
        const words = name.trim().split(/\s+/);
        const acronym = words
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(-3);
        newCode = acronym ? `MLD-${acronym}01` : 'MLD-NEW';
      }
      return { ...prev, name, code: newCode };
    });
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên chi nhánh.');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập mã định danh chi nhánh.');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập số điện thoại hotline cơ sở.');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập địa chỉ cơ sở.');
      return;
    }

    setIsSubmitting(true);
    try {
      const branchPayload: Omit<Branch, 'id'> = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        district: formData.district.trim() || 'Quận 1',
        city: formData.city.trim() || 'TP. Hồ Chí Minh',
        latitude: 10.7769,
        longitude: 106.7009,
        openingTime: `${formData.openingTime}:00`,
        closingTime: `${formData.closingTime}:00`,
        imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
        galleryUrls: [
          formData.imageUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
          'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800',
        ],
        amenities:
          formData.amenities.length > 0
            ? formData.amenities
            : ['Phòng VIP riêng biệt', 'Đỗ xe ô tô miễn phí', 'Trà thảo mộc & bánh ngọt'],
        isActive: true,
      };

      const res = await branchService.createBranch(branchPayload);
      const createdBranch = res.data;

      // Update state
      const updatedList = [createdBranch, ...branches];
      setBranches(updatedList);
      setSelectedBranchId(createdBranch.id);

      // Persist to localStorage
      try {
        const stored = localStorage.getItem('mld_custom_branches');
        const customArr: Branch[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem('mld_custom_branches', JSON.stringify([createdBranch, ...customArr]));
      } catch {}

      // Cơ sở mới tạo để trống sơ đồ phòng (không tự ý chèn phòng mẫu)
      localStorage.setItem(`mld_rooms_${createdBranch.id}`, JSON.stringify([]));

      toast.success(
        'Thêm chi nhánh thành công',
        `Cơ sở ${createdBranch.name} (${createdBranch.code}) đã được kích hoạt thành công trên hệ thống.`
      );
      setIsCreateModalOpen(false);
      window.dispatchEvent(new CustomEvent('mld_branches_updated'));

      // Reset form
      setFormData({
        name: '',
        code: '',
        phone: '',
        address: '',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
        openingTime: '08:30',
        closingTime: '20:30',
        imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
        amenities: ['Phòng VIP riêng biệt', 'Đỗ xe ô tô miễn phí', 'Trà thảo mộc & bánh ngọt'],
      });
    } catch (err) {
      console.error('Lỗi khi thêm chi nhánh:', err);
      toast.error('Có lỗi xảy ra', 'Không thể khởi tạo chi nhánh mới vào lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSortBranch = (field: 'name' | 'code' | 'city' | 'status') => {
    if (branchSortField === field) {
      if (branchSortOrder === 'asc') {
        setBranchSortOrder('desc');
      } else {
        setBranchSortField(null);
        setBranchSortOrder('asc');
      }
    } else {
      setBranchSortField(field);
      setBranchSortOrder('asc');
    }
  };

  const handleSortRoom = (field: 'name' | 'branch' | 'roomType' | 'bedCapacity' | 'status') => {
    if (roomSortField === field) {
      if (roomSortOrder === 'asc') {
        setRoomSortOrder('desc');
      } else {
        setRoomSortField(null);
        setRoomSortOrder('asc');
      }
    } else {
      setRoomSortField(field);
      setRoomSortOrder('asc');
    }
  };

  const hasActiveFilter = searchTerm.trim().length > 0 || selectedCity !== 'ALL' || selectedStatus !== 'ALL';

  const filteredBranches = useMemo(() => {
    const list = branches.filter((b) => {
      if (selectedCity !== 'ALL' && !matchSearch(b.city, selectedCity)) {
        return false;
      }
      if (selectedStatus === 'ACTIVE' && !b.isActive) return false;
      if (selectedStatus === 'INACTIVE' && b.isActive) return false;

      if (!searchTerm.trim()) return true;
      return matchSearch(
        [b.name, b.code, b.address, b.district, b.city, b.phone],
        searchTerm
      );
    });

    if (!branchSortField) return list;

    return [...list].sort((a, b) => {
      if (branchSortField === 'status') {
        const valA = a.isActive ? 1 : 0;
        const valB = b.isActive ? 1 : 0;
        return branchSortOrder === 'asc' ? valA - valB : valB - valA;
      }
      let valA = '';
      let valB = '';
      if (branchSortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (branchSortField === 'code') {
        valA = (a.code || '').toLowerCase();
        valB = (b.code || '').toLowerCase();
      } else if (branchSortField === 'city') {
        valA = (a.city || '').toLowerCase();
        valB = (b.city || '').toLowerCase();
      }
      const cmp = valA.localeCompare(valB, 'vi');
      return branchSortOrder === 'asc' ? cmp : -cmp;
    });
  }, [branches, selectedCity, selectedStatus, searchTerm, branchSortField, branchSortOrder]);

  const totalBranchPages = Math.max(1, Math.ceil(filteredBranches.length / branchPageSize));

  const paginatedBranches = useMemo(() => {
    const start = (branchPage - 1) * branchPageSize;
    return filteredBranches.slice(start, start + branchPageSize);
  }, [filteredBranches, branchPage, branchPageSize]);

  const selectedBranch = useMemo(() => {
    return (
      filteredBranches.find((b) => b.id === selectedBranchId) ||
      filteredBranches[0] ||
      branches.find((b) => b.id === selectedBranchId) ||
      branches[0]
    );
  }, [filteredBranches, branches, selectedBranchId]);

  const activeBranchIds = useMemo(() => new Set(branches.map((b) => b.id)), [branches]);

  const activeRoomsCount = useMemo(
    () => allRooms.filter((r) => activeBranchIds.has(r.branchId)).length,
    [allRooms, activeBranchIds]
  );

  const hasActiveRoomFilter =
    roomSearchTerm.trim().length > 0 ||
    selectedRoomBranch !== 'ALL' ||
    selectedRoomType !== 'ALL' ||
    selectedRoomAvailability !== 'ALL';

  const filteredRooms = useMemo(() => {
    const list = allRooms.filter((r) => {
      // Ẩn phòng thuộc các chi nhánh đã xóa/lưu trữ khỏi danh sách phòng vận hành
      if (!activeBranchIds.has(r.branchId)) return false;
      if (selectedRoomBranch !== 'ALL' && r.branchId !== selectedRoomBranch) return false;
      if (selectedRoomType !== 'ALL' && r.roomType !== selectedRoomType) return false;
      if (selectedRoomAvailability === 'YES' && !r.isAvailable) return false;
      if (selectedRoomAvailability === 'NO' && r.isAvailable) return false;

      if (!roomSearchTerm.trim()) return true;
      return matchSearch(
        [
          r.name,
          r.branchName || '',
          r.branchCode || '',
          roomTypeLabels[r.roomType] || r.roomType,
        ],
        roomSearchTerm
      );
    });

    if (!roomSortField) return list;

    return [...list].sort((a, b) => {
      if (roomSortField === 'bedCapacity') {
        return roomSortOrder === 'asc'
          ? a.bedCapacity - b.bedCapacity
          : b.bedCapacity - a.bedCapacity;
      }
      if (roomSortField === 'status') {
        const valA = a.isAvailable ? 1 : 0;
        const valB = b.isAvailable ? 1 : 0;
        return roomSortOrder === 'asc' ? valA - valB : valB - valA;
      }
      let valA = '';
      let valB = '';
      if (roomSortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (roomSortField === 'branch') {
        valA = (a.branchName || '').toLowerCase();
        valB = (b.branchName || '').toLowerCase();
      } else if (roomSortField === 'roomType') {
        valA = (roomTypeLabels[a.roomType] || a.roomType).toLowerCase();
        valB = (roomTypeLabels[b.roomType] || b.roomType).toLowerCase();
      }
      const cmp = valA.localeCompare(valB, 'vi');
      return roomSortOrder === 'asc' ? cmp : -cmp;
    });
  }, [
    allRooms,
    activeBranchIds,
    selectedRoomBranch,
    selectedRoomType,
    selectedRoomAvailability,
    roomSearchTerm,
    roomSortField,
    roomSortOrder,
  ]);

  const totalRoomPages = Math.max(1, Math.ceil(filteredRooms.length / roomPageSize));

  const paginatedRooms = useMemo(() => {
    const start = (roomPage - 1) * roomPageSize;
    return filteredRooms.slice(start, start + roomPageSize);
  }, [filteredRooms, roomPage, roomPageSize]);

  // Derived rooms for selected branch inspection (Single Source of Truth)
  const rooms = useMemo(() => {
    return allRooms.filter((r) => r.branchId === selectedBranchId);
  }, [allRooms, selectedBranchId]);

  // Auto-reset selectedRoomBranch if selected branch was deleted
  useEffect(() => {
    if (selectedRoomBranch !== 'ALL' && !activeBranchIds.has(selectedRoomBranch)) {
      setSelectedRoomBranch('ALL');
    }
  }, [activeBranchIds, selectedRoomBranch]);

  // Reset pagination when search/filter criteria change
  useEffect(() => {
    setBranchPage(1);
  }, [searchTerm, selectedCity, selectedStatus, branchPageSize]);

  useEffect(() => {
    setRoomPage(1);
  }, [roomSearchTerm, selectedRoomBranch, selectedRoomType, selectedRoomAvailability, roomPageSize]);

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <span className="text-[12px] font-medium text-[#73675F]">Cơ sở</span>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            {activeMainTab === 'branches' ? 'Chi nhánh' : 'Phòng dịch vụ'}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadAllData(true)}
            disabled={isRefreshing}
            className="p-2.5 bg-white hover:bg-[#FAF8F5] border border-[#E0D7CC] text-[#73675F] hover:text-[#985018] rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0"
            title="Làm mới dữ liệu từ Supabase Cloud"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#985018]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeMainTab === 'branches') {
                setIsCreateModalOpen(true);
              } else {
                handleOpenCrossBranchCreateRoom();
              }
            }}
            className="px-4 py-2 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs: Chi nhánh | Phòng dịch vụ */}
      <div className="flex items-center gap-1 border-b border-[#EFE4D9] pb-0 bg-transparent">
        <button
          type="button"
          onClick={() => setActiveMainTab('branches')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all relative cursor-pointer ${
            activeMainTab === 'branches'
              ? 'text-[#985018]'
              : 'text-[#73675F] hover:text-[#2C241E]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Chi nhánh</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeMainTab === 'branches'
                ? 'bg-[#FAF0E4] text-[#8A4F23]'
                : 'bg-[#F4ECE3] text-[#73675F]'
            }`}
          >
            {branches.length}
          </span>
          {activeMainTab === 'branches' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#985018] rounded-t-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('rooms')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all relative cursor-pointer ${
            activeMainTab === 'rooms'
              ? 'text-[#985018]'
              : 'text-[#73675F] hover:text-[#2C241E]'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          <span>Phòng dịch vụ</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeMainTab === 'rooms'
                ? 'bg-[#FAF0E4] text-[#8A4F23]'
                : 'bg-[#F4ECE3] text-[#73675F]'
            }`}
          >
            {activeRoomsCount}
          </span>
          {activeMainTab === 'rooms' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#985018] rounded-t-full" />
          )}
        </button>
      </div>

      {/* 3. Tab Content */}
      {activeMainTab === 'branches' ? (
        <>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#EFE4D9] flex flex-wrap items-center gap-2.5 shadow-xs">
        <div className="relative flex-1 min-w-[220px] max-w-xs w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full h-10 pl-10 pr-9 bg-white border border-[#E0D7CC] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="relative shrink-0">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
          >
            <option value="ALL">Đang hoạt động: Tất cả</option>
            <option value="ACTIVE">Có</option>
            <option value="INACTIVE">Không</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* City Filter */}
        <div className="relative shrink-0">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
          >
            <option value="ALL">Tất cả tỉnh / thành phố ({cityOptions.length})</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset button when filters are active */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCity('ALL');
              setSelectedStatus('ALL');
            }}
            className="flex items-center gap-1.5 px-3 h-10 rounded-xl border border-[#E5D7C9] bg-[#FAF3EC] text-[#985018] hover:bg-[#F3E5D5] text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            title="Đặt lại toàn bộ bộ lọc"
          >
            <X className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        )}

        {/* Total services badge */}
        <button
          type="button"
          onClick={() => navigate('/treatment-management')}
          className="flex items-center justify-between gap-2 px-3.5 h-10 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors shrink-0 flex-1 sm:flex-none cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8C7A6B]" />
          <span>{services.length || 3} dịch vụ spa</span>
        </button>

        {/* Archived branches toggle button */}
        <button
          type="button"
          onClick={() => setShowArchivedBranchesDrawer(!showArchivedBranchesDrawer)}
          className={`flex items-center gap-1.5 px-3.5 h-10 rounded-xl border text-xs font-bold transition-colors shrink-0 cursor-pointer ${
            showArchivedBranchesDrawer
              ? 'bg-[#FAF0E4] border-[#BA7E4C] text-[#8D4B1A]'
              : 'bg-white border-[#E0D7CC] text-[#73675F] hover:bg-[#FAF8F5]'
          }`}
          title="Xem danh sách chi nhánh đã xóa và lưu trữ trong CSDL"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Chi nhánh đã lưu trữ CSDL ({allArchivedBranches.length})</span>
        </button>
      </div>

      {/* 3. Main Branches Table Card */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#EFE4D9] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#2C241E]">Danh sách chi nhánh</h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5EBE1] text-[#985018] border border-[#E8DACB]">
            {filteredBranches.length} cơ sở
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4ECE3] text-[#695A4E] text-[11px] font-bold select-none">
              <tr>
                <th
                  onClick={() => handleSortBranch('name')}
                  className="py-2.5 px-5 cursor-pointer hover:text-[#985018] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tên</span>
                    {branchSortField === 'name' ? (
                      branchSortOrder === 'asc' ? <ChevronDown className="w-3 h-3 rotate-180 text-[#985018]" /> : <ChevronDown className="w-3 h-3 text-[#985018]" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortBranch('code')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#985018] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Mã</span>
                    {branchSortField === 'code' ? (
                      branchSortOrder === 'asc' ? <ChevronDown className="w-3 h-3 rotate-180 text-[#985018]" /> : <ChevronDown className="w-3 h-3 text-[#985018]" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-4">Số điện thoại</th>
                <th className="py-2.5 px-4">Địa chỉ</th>
                <th
                  onClick={() => handleSortBranch('city')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#985018] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tỉnh / Thành phố</span>
                    {branchSortField === 'city' ? (
                      branchSortOrder === 'asc' ? <ChevronDown className="w-3 h-3 rotate-180 text-[#985018]" /> : <ChevronDown className="w-3 h-3 text-[#985018]" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortBranch('status')}
                  className="py-2.5 px-4 text-center cursor-pointer hover:text-[#985018] transition-colors"
                >
                  <div className="inline-flex items-center justify-center gap-1.5">
                    <span>Đang hoạt động</span>
                    {branchSortField === 'status' ? (
                      branchSortOrder === 'asc' ? <ChevronDown className="w-3 h-3 rotate-180 text-[#985018]" /> : <ChevronDown className="w-3 h-3 text-[#985018]" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-6 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9]">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#73675F]">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy chi nhánh phù hợp</p>
                      <p className="text-xs text-[#8C7A6B]">
                        {searchTerm.trim()
                          ? `Không có cơ sở nào khớp với từ khóa "${searchTerm}". Hãy thử tìm theo tên, quận huyện (ví dụ: Q3, Q1), hoặc địa chỉ.`
                          : 'Không có chi nhánh nào khớp với bộ lọc đã chọn.'}
                      </p>
                      {hasActiveFilter && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedCity('ALL');
                            setSelectedStatus('ALL');
                          }}
                          className="mt-2 px-3.5 py-1.5 text-xs font-bold text-[#8A4F23] bg-[#F5E9DB] hover:bg-[#EFE4D9] rounded-xl transition-colors cursor-pointer"
                        >
                          Xóa bộ lọc tìm kiếm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBranches.map((branch) => {
                  const isSelected = branch.id === selectedBranchId;
                  return (
                    <tr
                      key={branch.id}
                      onClick={() => handleSelectBranch(branch.id)}
                      className={`cursor-pointer ${
                        isSelected ? 'bg-[#F8F1E8]' : 'bg-white'
                      } hover:bg-[#FAF6F0] transition-colors`}
                    >
                      {/* Tên */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className="w-4 h-4 text-[#985018] shrink-0" />
                          <span className="font-bold text-[#2C241E]">{branch.name}</span>
                          {branch.id === globalWorkingBranchId && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold border border-emerald-200">
                              Cơ sở chính
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mã */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#8A4F23]">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-[#FAF0E4]">
                          {branch.code || 'MLD-NEW'}
                        </span>
                      </td>

                      {/* Số điện thoại */}
                      <td className="py-3.5 px-4 font-semibold text-[#2C241E]">
                        <a
                          href={`tel:${branch.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-[#985018] hover:underline"
                        >
                          {branch.phone}
                        </a>
                      </td>

                      {/* Địa chỉ */}
                      <td className="py-3.5 px-4 text-[#4A3E34]">
                        <div>{branch.address}</div>
                        <div className="text-[11px] text-[#8C7A6B]">{branch.district}</div>
                      </td>

                      {/* Tỉnh / Thành phố */}
                      <td className="py-3.5 px-4 font-medium text-[#2C241E]">
                        {branch.city}
                      </td>

                      {/* Đang hoạt động */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleBranchActive(branch, e)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-[#2C241E] hover:text-[#985018] transition-colors"
                          title="Nhấp để thay đổi trạng thái hoạt động của cơ sở"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              branch.isActive ? 'bg-emerald-600' : 'bg-rose-500'
                            }`}
                          />
                          <span>{branch.isActive ? 'Có' : 'Không'}</span>
                        </button>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectBranch(branch.id);
                            }}
                            className="p-1.5 text-[#73675F] hover:text-[#985018] hover:bg-[#FAF0E4] rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết cơ sở"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenManageModal(branch);
                            }}
                            className="p-1.5 text-[#73675F] hover:text-[#985018] hover:bg-[#FAF0E4] rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin cơ sở"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteBranchModal(branch);
                            }}
                            className="p-1.5 text-[#B0A294] hover:text-[#B83E3E] hover:bg-[#FDF2F2] rounded-lg transition-colors cursor-pointer"
                            title="Xóa chi nhánh khỏi hệ thống (lưu trữ CSDL)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-white border-t border-[#EFE4D9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8A796B]">
          <span className="text-[12px] font-medium text-[#73675F]">
            {filteredBranches.length.toLocaleString('vi-VN')} bản ghi
          </span>
          <div className="flex items-center gap-2">
            <select
              aria-label="Số bản ghi mỗi trang"
              value={branchPageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setBranchPageSize(newSize);
                localStorage.setItem('mld_branch_pagesize', String(newSize));
              }}
              className="px-2.5 py-1 text-xs bg-white border border-[#E0D7CC] rounded-lg text-[#2C241E] focus:outline-none focus:ring-1 focus:ring-[#985018] cursor-pointer"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / trang
                </option>
              ))}
            </select>
            <button
              type="button"
              title="Trang trước"
              disabled={branchPage <= 1}
              onClick={() => setBranchPage((p) => Math.max(1, p - 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#E0D7CC] bg-white text-[#73675F] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-xs font-semibold text-[#2C241E]">
              {branchPage} / {totalBranchPages}
            </span>
            <button
              type="button"
              title="Trang sau"
              disabled={branchPage >= totalBranchPages}
              onClick={() => setBranchPage((p) => Math.min(totalBranchPages, p + 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#E0D7CC] bg-white text-[#73675F] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách chi nhánh đã lưu trữ trong CSDL (Soft-Delete) */}
      {allArchivedBranches.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowArchivedBranchesDrawer(!showArchivedBranchesDrawer)}
              className="flex items-center gap-2 text-xs font-bold text-[#73675F] hover:text-[#985018] cursor-pointer transition-colors"
            >
              <Archive className="w-4 h-4 text-[#985018]" />
              <span>
                Chi nhánh đã lưu trữ trong cơ sở dữ liệu ({allArchivedBranches.length})
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showArchivedBranchesDrawer ? 'rotate-180' : ''
                }`}
              />
            </button>
            <span className="text-[11px] text-[#8C7A6B]">
              Bảo toàn 100% dữ liệu CSDL
            </span>
          </div>

          {showArchivedBranchesDrawer && (
            <div className="pt-2 border-t border-[#EFE4D9] space-y-2.5 animate-in fade-in-50">
              <div className="flex items-start gap-2 p-2.5 bg-[#FAF3EC] border border-[#E8DFD8] rounded-xl text-[11px] text-[#73675F]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#985018] shrink-0 mt-0.5" />
                <span>
                  Các cơ sở này đã bị ẩn khỏi hệ thống điều phối và thu ngân. Bấm <strong>Khôi phục</strong> để kích hoạt cơ sở trở lại ngay lập tức.
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {allArchivedBranches.map((ab) => (
                  <div
                    key={ab.id}
                    className="p-3 bg-[#FAF8F5] rounded-xl border border-dashed border-[#D8C9BA] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#2C241E] flex items-center gap-1.5">
                        <span>{ab.name}</span>
                        <span className="text-[9.5px] px-1.5 py-0.2 bg-[#EFE4D9] text-[#73675F] rounded font-mono font-bold">
                          {ab.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8C7A6B] mt-0.5">
                        {ab.address}, {ab.district}, {ab.city}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreBranch(ab)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#BA7E4C] text-[#8D4B1A] hover:bg-[#FAF0E4] rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Khôi phục</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Bottom Section: Selected Branch Details & Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 of 12 cols = 66.6%) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedBranch && (
            <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#2C241E]">
                    Cơ sở đang chọn · {selectedBranch.district}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                      {selectedBranch.name}
                    </span>
                    {selectedBranch.code && (
                      <span className="text-[10px] font-mono font-bold text-[#73675F]">
                        ({selectedBranch.code})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start flex-wrap">
                  {selectedBranch.id === globalWorkingBranchId ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Check className="w-3.5 h-3.5" />
                      <span>Cơ sở làm việc chính</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetWorkingBranch(selectedBranch.id, selectedBranch.name)}
                      className="px-2.5 py-1.5 bg-[#FAF0E4] hover:bg-[#F3E2CE] text-[#8A4F23] border border-[#E8DACB] text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      title="Đặt làm cơ sở làm việc hiện tại trên toàn hệ thống"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Đặt làm cơ sở làm việc</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenManageModal(selectedBranch)}
                    className="px-3 py-1.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Quản lý cơ sở này</span>
                  </button>
                </div>
              </div>

              <div className="text-xs font-semibold text-[#2C241E] mt-1">
                {selectedBranch.address}
              </div>
              <div className="text-[11px] text-[#8C7A6B]">
                Hotline: {selectedBranch.phone} • Giờ hoạt động:{' '}
                {selectedBranch.openingTime ? selectedBranch.openingTime.slice(0, 5) : '08:30'} -{' '}
                {selectedBranch.closingTime ? selectedBranch.closingTime.slice(0, 5) : '20:30'}
              </div>

              {/* Specifications Key-Value 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2 text-xs pt-1 border-t border-[#EFE4D9]">
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#695A4E]">Số lượng phòng</span>
                  <span className="font-semibold text-[#2C241E]">{rooms.length} phòng dịch vụ</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#695A4E]">Kỹ thuật viên trưởng</span>
                  <span className="font-semibold text-[#2C241E]">Trần Lan Anh</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#695A4E]">Khung giờ tiếp khách</span>
                  <span className="font-semibold text-[#2C241E]">
                    {selectedBranch.openingTime ? selectedBranch.openingTime.slice(0, 5) : '08:30'}–
                    {selectedBranch.closingTime ? selectedBranch.closingTime.slice(0, 5) : '20:30'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#695A4E]">Danh sách phòng</span>
                  <span className="font-semibold text-[#2C241E] truncate max-w-[200px]" title={rooms.map((r) => r.name).join(', ')}>
                    {rooms.map((r) => r.name).join(', ') || 'Đang cập nhật'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 of 12 cols = 33.3%) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#2C241E]">Phân bổ phòng ốc cơ sở</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedBranch) {
                      await handleOpenManageModal(selectedBranch);
                      setActiveManageTab('rooms');
                      setShowAddRoom(true);
                    }
                  }}
                  className="px-2.5 py-1 bg-[#FAF0E4] hover:bg-[#F3E2CE] text-[#8A4F23] rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Thêm phòng mới vào cơ sở"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm phòng</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedBranch) {
                      await handleOpenManageModal(selectedBranch);
                      setActiveManageTab('rooms');
                    }
                  }}
                  className="text-xs text-[#985018] hover:underline font-bold cursor-pointer"
                >
                  Quản lý
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {rooms.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8C7A6B] space-y-2 bg-[#FAF8F5] rounded-xl border border-dashed border-[#E8DFD8] p-4">
                  <DoorOpen className="w-6 h-6 text-[#8A4F23] mx-auto opacity-70" />
                  <div>Cơ sở chưa có phòng nào được thiết lập.</div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (selectedBranch) {
                        await handleOpenManageModal(selectedBranch);
                        setActiveManageTab('rooms');
                        setShowAddRoom(true);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#985018] text-white rounded-lg text-xs font-bold hover:bg-[#854412] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm phòng ngay</span>
                  </button>
                </div>
              ) : (
                rooms.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] flex items-center justify-between text-xs hover:border-[#D7BBA6] transition-colors group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold text-[#2C241E] truncate">{r.name}</div>
                      <div className="text-[10px] text-[#8C7A6B]">
                        {roomTypeLabels[r.roomType] || r.roomType} • {r.bedCapacity} giường
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleCrossBranchRoomAvailability(r)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          r.isAvailable
                            ? 'bg-[#E8EFE5] text-[#526D51] hover:bg-[#D5E3CF]'
                            : 'bg-[#FBEBEB] text-[#B83E3E] hover:bg-[#F3D5D5]'
                        }`}
                        title="Bấm để chuyển đổi trạng thái sẵn sàng"
                      >
                        {r.isAvailable ? 'Sẵn sàng' : 'Đang bận'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCrossBranchEditRoom(r)}
                        className="p-1 text-[#8C7A6B] hover:text-[#985018] hover:bg-[#FAF0E4] rounded-lg transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                        title="Chỉnh sửa thông tin phòng"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
    /* Tab 2: Phòng dịch vụ toàn hệ thống (Cross-branch rooms master view) */
    <div className="space-y-4">
      {/* Rooms Search & Filter Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#EFE4D9] flex flex-wrap items-center gap-2.5 shadow-xs">
        <div className="relative flex-1 min-w-[220px] max-w-xs w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={roomSearchTerm}
            onChange={(e) => setRoomSearchTerm(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full h-10 pl-10 pr-9 bg-white border border-[#E0D7CC] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all"
          />
          {roomSearchTerm && (
            <button
              type="button"
              onClick={() => setRoomSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#A69788] hover:text-[#2C241E] rounded-full hover:bg-[#F4ECE3] transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Room Type Filter */}
        <div className="relative shrink-0">
          <select
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
          >
            <option value="ALL">Loại phòng: Tất cả</option>
            {Object.entries(roomTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Availability Filter */}
        <div className="relative shrink-0">
          <select
            value={selectedRoomAvailability}
            onChange={(e) => setSelectedRoomAvailability(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
          >
            <option value="ALL">Có thể sử dụng: Tất cả</option>
            <option value="YES">Có</option>
            <option value="NO">Không</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Branch Filter */}
        <div className="relative shrink-0">
          <select
            value={selectedRoomBranch}
            onChange={(e) => setSelectedRoomBranch(e.target.value)}
            className="h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018] cursor-pointer"
          >
            <option value="ALL">Chi nhánh: Tất cả</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset button when filters are active */}
        {hasActiveRoomFilter && (
          <button
            type="button"
            onClick={() => {
              setRoomSearchTerm('');
              setSelectedRoomBranch('ALL');
              setSelectedRoomType('ALL');
              setSelectedRoomAvailability('ALL');
            }}
            className="flex items-center gap-1.5 px-3 h-10 rounded-xl border border-[#E5D7C9] bg-[#FAF3EC] text-[#985018] hover:bg-[#F3E5D5] text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            title="Đặt lại toàn bộ bộ lọc"
          >
            <X className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
        )}

        {/* Archived rooms toggle button */}
        <button
          type="button"
          onClick={() => setShowAllArchivedDrawer(!showAllArchivedDrawer)}
          className={`flex items-center gap-1.5 px-3.5 h-10 rounded-xl border text-xs font-bold transition-colors shrink-0 cursor-pointer ${
            showAllArchivedDrawer
              ? 'bg-[#FAF0E4] border-[#BA7E4C] text-[#8D4B1A]'
              : 'bg-white border-[#E0D7CC] text-[#73675F] hover:bg-[#FAF8F5]'
          }`}
          title="Xem danh sách phòng đã xóa và lưu trữ trong CSDL"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Phòng đã lưu trữ CSDL ({allArchivedRooms.length})</span>
        </button>
      </div>

      {/* Rooms Master Table Card */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#EFE4D9] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#2C241E]">Danh sách phòng dịch vụ toàn hệ thống</h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5EBE1] text-[#985018] border border-[#E8DACB]">
            {filteredRooms.length} phòng
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4ECE3] text-[#695A4E] text-[11px] font-bold select-none">
              <tr>
                <th
                  onClick={() => handleSortRoom('name')}
                  className="py-2.5 px-5 cursor-pointer hover:text-[#985018] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tên</span>
                    {roomSortField === 'name' ? (
                      roomSortOrder === 'asc' ? <ChevronDown className="w-3 h-3 rotate-180 text-[#985018]" /> : <ChevronDown className="w-3 h-3 text-[#985018]" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortRoom('branch')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#985018] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Chi nhánh</span>
                    {roomSortField === 'branch' ? (
                      roomSortOrder === 'asc' ? <ChevronDown className="w-3 h-3 rotate-180 text-[#985018]" /> : <ChevronDown className="w-3 h-3 text-[#985018]" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortRoom('roomType')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#985018] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Loại phòng</span>
                    {roomSortField === 'roomType' ? (
                      roomSortOrder === 'asc' ? <ChevronDown className="w-3 h-3 rotate-180 text-[#985018]" /> : <ChevronDown className="w-3 h-3 text-[#985018]" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortRoom('bedCapacity')}
                  className="py-2.5 px-4 cursor-pointer hover:text-[#985018] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Sức chứa (giường)</span>
                    {roomSortField === 'bedCapacity' ? (
                      roomSortOrder === 'asc' ? <ChevronDown className="w-3 h-3 rotate-180 text-[#985018]" /> : <ChevronDown className="w-3 h-3 text-[#985018]" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortRoom('status')}
                  className="py-2.5 px-4 text-center cursor-pointer hover:text-[#985018] transition-colors"
                >
                  <div className="inline-flex items-center justify-center gap-1.5">
                    <span>Có thể sử dụng</span>
                    {roomSortField === 'status' ? (
                      roomSortOrder === 'asc' ? <ChevronDown className="w-3 h-3 rotate-180 text-[#985018]" /> : <ChevronDown className="w-3 h-3 text-[#985018]" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-6 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9]">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#73675F]">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-[#FAF0E4] flex items-center justify-center text-[#985018]">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-[#3E200C]">Không tìm thấy phòng dịch vụ phù hợp</p>
                      <p className="text-xs text-[#8C7A6B]">
                        {roomSearchTerm.trim()
                          ? `Không có phòng nào khớp với từ khóa "${roomSearchTerm}". Hãy thử tìm theo tên phòng, tên chi nhánh hoặc loại phòng.`
                          : 'Không có phòng nào khớp với bộ lọc đã chọn.'}
                      </p>
                      {hasActiveRoomFilter && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoomSearchTerm('');
                            setSelectedRoomBranch('ALL');
                            setSelectedRoomType('ALL');
                            setSelectedRoomAvailability('ALL');
                          }}
                          className="mt-2 px-3.5 py-1.5 text-xs font-bold text-[#8A4F23] bg-[#F5E9DB] hover:bg-[#EFE4D9] rounded-xl transition-colors cursor-pointer"
                        >
                          Xóa bộ lọc tìm kiếm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-[#FAF6F0] transition-colors bg-white">
                    {/* Tên */}
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-[#2C241E]">{room.name}</span>
                    </td>

                    {/* Chi nhánh */}
                    <td className="py-3.5 px-4 font-medium text-[#2C241E]">
                      {room.branchName || 'Cơ sở MLD'}
                    </td>

                    {/* Loại phòng */}
                    <td className="py-3.5 px-4 text-[#4A3E34]">
                      {roomTypeLabels[room.roomType] || room.roomType}
                    </td>

                    {/* Sức chứa (giường) */}
                    <td className="py-3.5 px-4 font-medium text-[#2C241E]">
                      {room.bedCapacity}
                    </td>

                    {/* Có thể sử dụng */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleCrossBranchRoomAvailability(room)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-[#2C241E] hover:text-[#985018] transition-colors"
                        title="Nhấp để thay đổi trạng thái khả dụng của phòng"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            room.isAvailable ? 'bg-emerald-600' : 'bg-rose-500'
                          }`}
                        />
                        <span>{room.isAvailable ? 'Có' : 'Không'}</span>
                      </button>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenCrossBranchViewRoom(room)}
                          className="p-1.5 text-[#73675F] hover:text-[#985018] hover:bg-[#FAF0E4] rounded-lg transition-colors cursor-pointer"
                          title="Xem chi tiết phòng"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCrossBranchEditRoom(room)}
                          className="p-1.5 text-[#73675F] hover:text-[#985018] hover:bg-[#FAF0E4] rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin phòng"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCrossBranchRoom(room)}
                          className="p-1.5 text-[#B0A294] hover:text-[#B83E3E] hover:bg-[#FDF2F2] rounded-lg transition-colors cursor-pointer"
                          title="Xóa phòng khỏi hệ thống (lưu trữ CSDL)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-white border-t border-[#EFE4D9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8A796B]">
          <span className="text-[12px] font-medium text-[#73675F]">
            {filteredRooms.length.toLocaleString('vi-VN')} bản ghi
          </span>
          <div className="flex items-center gap-2">
            <select
              aria-label="Số phòng mỗi trang"
              value={roomPageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setRoomPageSize(newSize);
                localStorage.setItem('mld_room_pagesize', String(newSize));
              }}
              className="px-2.5 py-1 text-xs bg-white border border-[#E0D7CC] rounded-lg text-[#2C241E] focus:outline-none focus:ring-1 focus:ring-[#985018] cursor-pointer"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / trang
                </option>
              ))}
            </select>
            <button
              type="button"
              title="Trang trước"
              disabled={roomPage <= 1}
              onClick={() => setRoomPage((p) => Math.max(1, p - 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#E0D7CC] bg-white text-[#73675F] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-xs font-semibold text-[#2C241E]">
              {roomPage} / {totalRoomPages}
            </span>
            <button
              type="button"
              title="Trang sau"
              disabled={roomPage >= totalRoomPages}
              onClick={() => setRoomPage((p) => Math.min(totalRoomPages, p + 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center border border-[#E0D7CC] bg-white text-[#73675F] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Archived Rooms Section (When toggled open) */}
      {showAllArchivedDrawer && (
        <div className="bg-white rounded-2xl border border-[#EFE4D9] p-5 shadow-xs space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between pb-2 border-b border-[#EFE4D9]">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-[#985018]" />
              <h3 className="text-sm font-bold text-[#2C241E]">
                Danh sách phòng đã lưu trữ trong cơ sở dữ liệu ({allArchivedRooms.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAllArchivedDrawer(false)}
              className="p-1 text-[#8C7A6B] hover:text-[#2C241E] rounded-lg hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-[#FAF3EC] border border-[#E8DFD8] rounded-xl text-xs text-[#73675F]">
            <ShieldCheck className="w-4 h-4 text-[#985018] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Tất cả các phòng trong danh sách này đã được xóa khỏi hệ thống vận hành nhưng{' '}
              <strong className="text-[#985018]">vẫn được bảo toàn nguyên vẹn 100% trong CSDL Supabase Cloud</strong>.
              Bạn có thể nhấn <strong>Khôi phục</strong> bất kỳ lúc nào để đưa phòng trở lại hoạt động.
            </p>
          </div>

          {allArchivedRooms.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8C7A6B]">
              Chưa có phòng nào bị xóa hoặc lưu trữ trong CSDL.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {allArchivedRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-3.5 bg-[#FAF8F5] rounded-xl border border-dashed border-[#D8C9BA] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#2C241E] flex items-center gap-2">
                      <span>{room.name}</span>
                      <span className="text-[9.5px] px-1.5 py-0.2 bg-[#EFE4D9] text-[#73675F] rounded font-bold">
                        Lưu trữ CSDL
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8C7A6B] mt-0.5">
                      {room.branchName} • {roomTypeLabels[room.roomType] || room.roomType} • {room.bedCapacity} giường
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreCrossBranchRoom(room)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#BA7E4C] text-[#8D4B1A] hover:bg-[#FAF0E4] rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Khôi phục</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )}

      {/* 5. Modal Quản Lý Cơ Sở Chi Nhánh (Full Interactive Management Modal) */}
      {isManageModalOpen && managingBranch && (
        <div
          onClick={() => {
            if (!isSavingBranch) setIsManageModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EFE4D9] bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F3E2CE] flex items-center justify-center text-[#8A4F23] shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-[#3E200C]">Quản lý cơ sở chi nhánh</h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        editForm.isActive ? 'bg-[#E8EFE5] text-[#526D51]' : 'bg-[#FBEBEB] text-[#B83E3E]'
                      }`}
                    >
                      {editForm.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>
                  <p className="text-xs text-[#73675F] mt-0.5 truncate max-w-md">
                    {managingBranch.name} ({managingBranch.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#EFE4D9] bg-[#FAF8F5] px-5 pt-2 gap-4 text-xs">
              <button
                type="button"
                onClick={() => setActiveManageTab('info')}
                className={`pb-2.5 font-bold transition-all border-b-2 cursor-pointer ${
                  activeManageTab === 'info'
                    ? 'border-[#985018] text-[#985018]'
                    : 'border-transparent text-[#73675F] hover:text-[#2C241E]'
                }`}
              >
                Thông tin chung & Giờ mở cửa
              </button>
              <button
                type="button"
                onClick={() => setActiveManageTab('rooms')}
                className={`pb-2.5 font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                  activeManageTab === 'rooms'
                    ? 'border-[#985018] text-[#985018]'
                    : 'border-transparent text-[#73675F] hover:text-[#2C241E]'
                }`}
              >
                <span>Sơ đồ phòng ốc ({manageRooms.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveManageTab('actions')}
                className={`pb-2.5 font-bold transition-all border-b-2 cursor-pointer ${
                  activeManageTab === 'actions'
                    ? 'border-[#985018] text-[#985018]'
                    : 'border-transparent text-[#73675F] hover:text-[#2C241E]'
                }`}
              >
                Tác vụ vận hành
              </button>
            </div>

            {/* Tab 1: Thông tin chung & Giờ mở cửa */}
            {activeManageTab === 'info' && (
              <form onSubmit={handleSaveBranch} className="overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Tên cơ sở chi nhánh <span className="text-[#985018]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Mã định danh cơ sở <span className="text-[#985018]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.code}
                      onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] font-bold uppercase focus:outline-none focus:border-[#985018]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Số điện thoại Hotline <span className="text-[#985018]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>

                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5 truncate">
                      Tỉnh / Thành phố
                    </label>
                    <div className="relative w-full min-w-0">
                      <select
                        value={editForm.city}
                        onChange={(e) => handleEditCityChange(e.target.value)}
                        className="w-full appearance-none pl-3.5 pr-8 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] truncate cursor-pointer box-border"
                      >
                        {cityOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#2C241E] truncate">
                        Quận / Huyện
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomEditDistrict(!isCustomEditDistrict)}
                        className="text-[11px] text-[#985018] hover:underline font-semibold shrink-0"
                      >
                        {isCustomEditDistrict ? '← Chọn danh sách' : '+ Tự nhập'}
                      </button>
                    </div>
                    {isCustomEditDistrict ? (
                      <input
                        type="text"
                        placeholder="Nhập quận / huyện / phường..."
                        value={editForm.district}
                        onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] box-border"
                      />
                    ) : (
                      <div className="relative w-full min-w-0">
                        <select
                          value={editForm.district}
                          onChange={(e) => {
                            if (e.target.value === '__CUSTOM__') {
                              setIsCustomEditDistrict(true);
                              setEditForm({ ...editForm, district: '' });
                            } else {
                              setEditForm({ ...editForm, district: e.target.value });
                            }
                          }}
                          className="w-full appearance-none pl-3.5 pr-8 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] truncate cursor-pointer box-border"
                        >
                          {editForm.district && !(VIETNAM_LOCATIONS_2026[editForm.city] || []).includes(editForm.district) && (
                            <option value={editForm.district}>{editForm.district}</option>
                          )}
                          {(VIETNAM_LOCATIONS_2026[editForm.city] || []).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                          <option value="__CUSTOM__">+ Nhập quận / huyện / phường khác...</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Địa chỉ cụ thể
                    </label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Giờ mở cửa
                    </label>
                    <input
                      type="time"
                      value={editForm.openingTime}
                      onChange={(e) => setEditForm({ ...editForm, openingTime: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Giờ đóng cửa
                    </label>
                    <input
                      type="time"
                      value={editForm.closingTime}
                      onChange={(e) => setEditForm({ ...editForm, closingTime: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Trạng thái hoạt động
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="branch_status"
                          checked={editForm.isActive === true}
                          onChange={() => setEditForm({ ...editForm, isActive: true })}
                          className="text-[#985018] focus:ring-[#985018]"
                        />
                        <span className="font-semibold text-[#137333]">Đang hoạt động</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="branch_status"
                          checked={editForm.isActive === false}
                          onChange={() => setEditForm({ ...editForm, isActive: false })}
                          className="text-[#985018] focus:ring-[#985018]"
                        />
                        <span className="font-semibold text-[#B83E3E]">Tạm dừng đón khách</span>
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-[#EFE4D9]">
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Tiện ích & Dịch vụ đi kèm
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableAmenities.map((amenity) => {
                        const isSelected = editForm.amenities.includes(amenity);
                        return (
                          <div
                            key={amenity}
                            onClick={() => toggleEditAmenity(amenity)}
                            className={`p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#FAF0E4] border-[#985018] text-[#985018] ring-1 ring-[#985018]'
                                : 'bg-white border-[#E8DFD8] text-[#73675F] hover:border-[#D7BBA6]'
                            }`}
                          >
                            <span>{amenity}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#985018]" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="pt-4 border-t border-[#EFE4D9] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsManageModalOpen(false)}
                    className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBranch}
                    className="px-6 py-2 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSavingBranch ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Lưu cập nhật cơ sở</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Sơ đồ phòng ốc */}
            {activeManageTab === 'rooms' && (
              <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#2C241E]">
                      Danh sách phòng trị liệu & phòng học ({manageRooms.length})
                    </h4>
                    <p className="text-[11px] text-[#8C7A6B]">
                      Cấu hình loại phòng, số giường và trạng thái sẵn sàng đón khách
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddRoom(!showAddRoom)}
                    className="px-3 py-1.5 bg-[#FAF0E4] hover:bg-[#F3E2CE] text-[#8A4F23] rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddRoom ? 'Đóng form thêm' : 'Thêm phòng mới'}</span>
                  </button>
                </div>

                {/* Data Preservation Policy Banner */}
                <div className="flex items-start gap-2.5 p-3 bg-[#FAF3EC] border border-[#E8DFD8] rounded-xl text-xs text-[#73675F]">
                  <ShieldCheck className="w-4 h-4 text-[#985018] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#3E200C]">Chính sách bảo toàn dữ liệu phòng</p>
                    <p className="text-[11px] text-[#73675F] leading-relaxed">
                      Khi xóa phòng, hệ thống sẽ ẩn phòng khỏi hoạt động vận hành và đặt hẹn, đồng thời <span className="font-bold text-[#985018]">bảo lưu 100% bản ghi trong cơ sở dữ liệu Supabase</span> để giữ toàn vẹn lịch sử đối soát và liên kết với các lượt đặt trước đó.
                    </p>
                  </div>
                </div>

                {/* Form thêm phòng mới */}
                {showAddRoom && (
                  <form
                    onSubmit={handleAddRoom}
                    className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EFE4D9] space-y-3 animate-in fade-in-50 zoom-in-95"
                  >
                    <div className="font-bold text-xs text-[#8E4002] flex items-center gap-1.5">
                      <DoorOpen className="w-4 h-4" />
                      <span>Thêm phòng mới vào cơ sở</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-bold text-[#2C241E] mb-1">
                          Tên phòng <span className="text-[#B83E3E]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newRoomData.name}
                          onChange={(e) =>
                            setNewRoomData({ ...newRoomData, name: e.target.value })
                          }
                          placeholder="VD: Phòng VIP 01, Phòng Body..."
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-xs placeholder:text-[#A69788] focus:outline-none focus:border-[#985018]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#2C241E] mb-1">
                          Loại phòng <span className="text-[#B83E3E]">*</span>
                        </label>
                        <select
                          required
                          value={newRoomData.roomType}
                          onChange={(e) =>
                            setNewRoomData({
                              ...newRoomData,
                              roomType: e.target.value as RoomType,
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-xs focus:outline-none focus:border-[#985018]"
                        >
                          <option value="" disabled>-- Chọn loại phòng --</option>
                          {Object.entries(roomTypeLabels).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#2C241E] mb-1">
                          Số giường <span className="text-[#B83E3E]">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="20"
                          value={newRoomData.bedCapacity}
                          onChange={(e) =>
                            setNewRoomData({
                              ...newRoomData,
                              bedCapacity: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="VD: 2"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-xs placeholder:text-[#A69788] focus:outline-none focus:border-[#985018]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddRoom(false)}
                        className="px-3 py-1.5 text-xs text-[#73675F] hover:bg-white rounded-lg cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={isAddingRoom}
                        className="px-4 py-1.5 bg-[#985018] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#854412] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isAddingRoom ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang lưu phòng...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Lưu phòng</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* Danh sách phòng */}
                <div className="space-y-2">
                  {manageRooms.length === 0 ? (
                    <div className="py-8 text-center text-[#8C7A6B] text-xs space-y-2.5 bg-[#FAF8F5] rounded-xl border border-dashed border-[#E8DFD8] p-4">
                      <DoorOpen className="w-7 h-7 text-[#8A4F23] mx-auto opacity-70" />
                      <div>Chưa có phòng nào được tạo cho cơ sở này.</div>
                      <button
                        type="button"
                        onClick={() => setShowAddRoom(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#985018] text-white text-xs font-bold rounded-lg hover:bg-[#854412] transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm phòng đầu tiên</span>
                      </button>
                    </div>
                  ) : (
                    manageRooms.map((room) => (
                      <div
                        key={room.id}
                        className="p-3 bg-white rounded-xl border border-[#EFE4D9] flex items-center justify-between text-xs hover:border-[#D7BBA6] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center font-bold">
                            <DoorOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-[#2C241E]">{room.name}</div>
                            <div className="text-[11px] text-[#8C7A6B]">
                              {roomTypeLabels[room.roomType] || room.roomType} •{' '}
                              <span className="font-semibold text-[#4A3E34]">
                                {room.bedCapacity} giường
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleRoomAvailability(room.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              room.isAvailable
                                ? 'bg-[#E8EFE5] text-[#526D51] hover:bg-[#D5E3CF]'
                                : 'bg-[#FBEBEB] text-[#B83E3E] hover:bg-[#F3D5D5]'
                            }`}
                            title="Bấm để chuyển đổi trạng thái sẵn sàng"
                          >
                            {room.isAvailable ? 'Sẵn sàng' : 'Bận / Bảo trì'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(room.id)}
                            className="p-1.5 text-[#B0A294] hover:text-[#B83E3E] hover:bg-[#FDF2F2] rounded-lg transition-colors cursor-pointer"
                            title="Xóa phòng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Danh sách phòng đã lưu trữ trong CSDL (Soft-deleted) */}
                {archivedRooms.length > 0 && (
                  <div className="pt-2 border-t border-[#EFE4D9] space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowArchivedRooms(!showArchivedRooms)}
                      className="w-full flex items-center justify-between p-2.5 bg-[#FAF8F5] hover:bg-[#F3EFEA] rounded-xl border border-[#EFE4D9] text-xs font-bold text-[#73675F] hover:text-[#2C241E] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Archive className="w-3.5 h-3.5 text-[#985018]" />
                        <span>Phòng đã lưu trữ trong cơ sở dữ liệu ({archivedRooms.length})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#985018]">
                        <span>{showArchivedRooms ? 'Thu gọn' : 'Xem chi tiết'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showArchivedRooms ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {showArchivedRooms && (
                      <div className="space-y-2 pt-1 animate-in fade-in-50">
                        {archivedRooms.map((room) => (
                          <div
                            key={room.id}
                            className="p-3 bg-[#FCFAF8] rounded-xl border border-dashed border-[#DDD2C6] flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#EFE4D9] text-[#73675F] flex items-center justify-center font-bold">
                                <Archive className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-[#4A3E34] flex items-center gap-2">
                                  <span>{room.name}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-[#EFE4D9] text-[#73675F]">
                                    Lưu trữ trong CSDL
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#8C7A6B] mt-0.5">
                                  {roomTypeLabels[room.roomType] || room.roomType} • {room.bedCapacity} giường
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRestoreRoom(room.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#BA7E4C] text-[#8D4B1A] hover:bg-[#FAF3EC] text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                              title="Khôi phục phòng này vào lại hệ thống vận hành"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Khôi phục</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-[#EFE4D9] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      toast.success('Đã lưu sơ đồ phòng', 'Sơ đồ phòng ốc đã được ghi nhận.');
                      setIsManageModalOpen(false);
                    }}
                    className="px-5 py-2 bg-[#985018] hover:bg-[#854412] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Hoàn tất thiết lập phòng
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Tác vụ vận hành */}
            {activeManageTab === 'actions' && (
              <div className="overflow-y-auto p-5 sm:p-6 space-y-3.5">
                {/* 1. Chuyển cơ sở làm việc chính */}
                <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EFE4D9] space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-[#2C241E]">
                      Chuyển cơ sở làm việc chính trên toàn hệ thống
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                      Mã: {managingBranch.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#73675F] leading-relaxed">
                    Đặt cơ sở <strong>"{managingBranch.name}"</strong> làm chi nhánh làm việc
                    mặc định cho tài khoản của bạn trên tất cả trang Tổng quan, Lịch hẹn và Thu ngân.
                  </p>
                  {managingBranch.id === globalWorkingBranchId ? (
                    <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>✓ Đang là chi nhánh làm việc chính của tài khoản</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setGlobalWorkingBranchId(managingBranch.id);
                        localStorage.setItem('mld_selected_branch_id', managingBranch.id);
                        window.dispatchEvent(
                          new CustomEvent('mld_branch_changed', {
                            detail: { branchId: managingBranch.id, branch: managingBranch },
                          })
                        );
                        toast.success(
                          'Đã đổi chi nhánh chính',
                          `Hệ thống đã chuyển sang ${managingBranch.name}.`
                        );
                      }}
                      className="mt-1 px-4 py-2 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đặt làm chi nhánh làm việc hiện tại</span>
                    </button>
                  )}
                </div>

                {/* 2. Điều hướng tác vụ nghiệp vụ chuyên biệt */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div
                    onClick={() => {
                      setGlobalWorkingBranchId(managingBranch.id);
                      localStorage.setItem('mld_selected_branch_id', managingBranch.id);
                      window.dispatchEvent(
                        new CustomEvent('mld_branch_changed', {
                          detail: { branchId: managingBranch.id, branch: managingBranch },
                        })
                      );
                      setIsManageModalOpen(false);
                      navigate(`/staff-schedule?branchId=${managingBranch.id}`);
                    }}
                    className="p-4 bg-white rounded-2xl border border-[#EFE4D9] hover:border-[#985018] hover:shadow-md transition-all cursor-pointer shadow-xs space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#2C241E] group-hover:text-[#985018] transition-colors">
                        Lịch kỹ thuật viên
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#985018]" />
                    </div>
                    <p className="text-[11px] text-[#8C7A6B]">
                      Xem sơ đồ phân ca và xếp lịch chuyên viên tại cơ sở này.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      setGlobalWorkingBranchId(managingBranch.id);
                      localStorage.setItem('mld_selected_branch_id', managingBranch.id);
                      window.dispatchEvent(
                        new CustomEvent('mld_branch_changed', {
                          detail: { branchId: managingBranch.id, branch: managingBranch },
                        })
                      );
                      setIsManageModalOpen(false);
                      navigate(`/cashier-pos?branchId=${managingBranch.id}`);
                    }}
                    className="p-4 bg-white rounded-2xl border border-[#EFE4D9] hover:border-[#985018] hover:shadow-md transition-all cursor-pointer shadow-xs space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#2C241E] group-hover:text-[#985018] transition-colors">
                        Thu ngân POS cơ sở
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#985018]" />
                    </div>
                    <p className="text-[11px] text-[#8C7A6B]">
                      Mở bàn thanh toán và xuất hóa đơn dịch vụ cho chi nhánh.
                    </p>
                  </div>
                </div>

                {/* 3. Bật / Tắt hoạt động đón khách trực tiếp */}
                <div className="p-4 bg-white rounded-2xl border border-[#EFE4D9] space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#2C241E]">
                      Trạng thái đón khách của cơ sở
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        managingBranch.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {managingBranch.isActive ? 'Đang hoạt động' : 'Tạm dừng đón khách'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#73675F] leading-relaxed">
                    {managingBranch.isActive
                      ? 'Cơ sở đang mở cửa tiếp nhận đặt lịch từ khách hàng và vận hành bình thường.'
                      : 'Cơ sở đang tạm ngừng đón khách (bảo trì hoặc tạm đóng cửa).'}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      const nextStatus = !managingBranch.isActive;
                      try {
                        await branchService.updateBranch(managingBranch.id, { isActive: nextStatus });
                        setManagingBranch({ ...managingBranch, isActive: nextStatus });
                        setBranches((prev) =>
                          prev.map((b) => (b.id === managingBranch.id ? { ...b, isActive: nextStatus } : b))
                        );
                        toast.success(
                          nextStatus ? 'Đã kích hoạt cơ sở' : 'Đã tạm dừng cơ sở',
                          `Cơ sở ${managingBranch.name} hiện ${
                            nextStatus ? 'đang mở cửa đón khách' : 'tạm dừng đón khách'
                          }.`
                        );
                      } catch {
                        toast.error('Lỗi', 'Không thể cập nhật trạng thái chi nhánh');
                      }
                    }}
                    className={`mt-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      managingBranch.isActive
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {managingBranch.isActive
                        ? 'Tạm dừng đón khách tại cơ sở này'
                        : 'Mở cửa đón khách trở lại'}
                    </span>
                  </button>
                </div>

                {/* 4. Thao tác tiện ích nhanh: Sơ đồ phòng & Sao chép link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setActiveManageTab('rooms')}
                    className="p-3.5 bg-white rounded-2xl border border-[#EFE4D9] hover:border-[#985018] transition-all cursor-pointer shadow-xs space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#2C241E] group-hover:text-[#985018] transition-colors">
                        Sơ đồ phòng ({manageRooms.length})
                      </span>
                      <DoorOpen className="w-3.5 h-3.5 text-[#985018]" />
                    </div>
                    <p className="text-[11px] text-[#8C7A6B]">
                      Cấu hình phòng VIP, phòng liệu trình và giường tại cơ sở.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      const branchInfo = `${managingBranch.name} (${managingBranch.code}) - ${managingBranch.address}, ${managingBranch.district}, ${managingBranch.city}. Hotline: ${managingBranch.phone}`;
                      navigator.clipboard.writeText(branchInfo);
                      toast.success(
                        'Đã sao chép thông tin cơ sở',
                        `Đã lưu địa chỉ và hotline ${managingBranch.name} vào bộ nhớ tạm.`
                      );
                    }}
                    className="p-3.5 bg-white rounded-2xl border border-[#EFE4D9] hover:border-[#985018] transition-all cursor-pointer shadow-xs space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#2C241E] group-hover:text-[#985018] transition-colors">
                        Sao chép địa chỉ cơ sở
                      </span>
                      <Copy className="w-3.5 h-3.5 text-[#985018]" />
                    </div>
                    <p className="text-[11px] text-[#8C7A6B]">
                      Lấy thông tin địa chỉ, giờ hoạt động và hotline cơ sở.
                    </p>
                  </div>
                </div>

                {/* 5. Vùng nguy hiểm: Xóa chi nhánh (Soft-delete & lưu trữ CSDL) */}
                <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-rose-900">
                      5. Xóa chi nhánh khỏi hệ thống vận hành
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      Bảo toàn CSDL
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800/80 leading-relaxed">
                    Hành động này sẽ ẩn cơ sở khỏi hệ thống điều phối, danh mục đặt lịch và POS. Dữ liệu lịch sử giao dịch và phân ca vẫn được lưu trữ vĩnh viễn trong CSDL.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const br = managingBranch;
                      setIsManageModalOpen(false);
                      handleOpenDeleteBranchModal(br);
                    }}
                    className="mt-1 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa cơ sở này</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Modal Thêm Chi Nhánh Mới */}
      {isCreateModalOpen && (
        <div
          onClick={() => {
            if (!isSubmitting) setIsCreateModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EFE4D9] bg-[#FAF8F5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F3E2CE] flex items-center justify-center text-[#8A4F23] shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-[#3E200C]">
                      Thêm cơ sở chi nhánh mới
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0E4] text-[#8A4F23] border border-[#E8DFD8]">
                      MLD Spa & Academy
                    </span>
                  </div>
                  <p className="text-xs text-[#73675F] mt-0.5">
                    Khởi tạo thông tin cơ sở, địa chỉ, giờ hoạt động & cấu hình tiện ích phòng ốc
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#E8DFD8] flex items-center justify-center text-[#73675F] hover:text-[#2C241E] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateBranch} className="overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* PHẦN 1: THÔNG TIN ĐỊNH DANH & LIÊN HỆ */}
              <div>
                <h4 className="text-xs font-bold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>1. Tên cơ sở & Thông tin liên hệ</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Tên chi nhánh <span className="text-[#985018]">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Ví dụ: MLD Spa & Clinic Gò Vấp"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Mã chi nhánh <span className="text-[#985018]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      placeholder="Ví dụ: MLD-GV01"
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] font-bold uppercase placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Số hotline tiếp đón <span className="text-[#985018]">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Ví dụ: 028 3988 6688"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PHẦN 2: ĐỊA CHỈ & KHU VỰC */}
              <div className="pt-2 border-t border-[#EFE4D9]">
                <h4 className="text-xs font-bold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>2. Vị trí địa lý & Địa chỉ cơ sở</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5 truncate">
                      Tỉnh / Thành phố <span className="text-[#985018]">*</span>
                    </label>
                    <div className="relative w-full min-w-0">
                      <select
                        value={formData.city}
                        onChange={(e) => handleCityChange(e.target.value)}
                        className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all truncate cursor-pointer box-border"
                      >
                        {cityOptions.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#2C241E] truncate">
                        Quận / Huyện <span className="text-[#985018]">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomDistrict(!isCustomDistrict)}
                        className="text-[11px] text-[#985018] hover:underline font-semibold shrink-0"
                      >
                        {isCustomDistrict ? '← Chọn danh sách' : '+ Tự nhập'}
                      </button>
                    </div>
                    {isCustomDistrict ? (
                      <input
                        type="text"
                        placeholder="Nhập quận / huyện / phường..."
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all box-border"
                      />
                    ) : (
                      <div className="relative w-full min-w-0">
                        <select
                          value={formData.district}
                          onChange={(e) => {
                            if (e.target.value === '__CUSTOM__') {
                              setIsCustomDistrict(true);
                              setFormData({ ...formData, district: '' });
                            } else {
                              setFormData({ ...formData, district: e.target.value });
                            }
                          }}
                          className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 transition-all truncate cursor-pointer box-border"
                        >
                          {(VIETNAM_LOCATIONS_2026[formData.city] || []).map((district) => (
                            <option key={district} value={district}>
                              {district}
                            </option>
                          ))}
                          <option value="__CUSTOM__">+ Nhập quận / huyện / phường khác...</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Địa chỉ chi tiết cơ sở <span className="text-[#985018]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ví dụ: Số 123 Quang Trung, Phường 10"
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018]"
                    />
                  </div>
                </div>
              </div>

              {/* PHẦN 3: GIỜ HOẠT ĐỘNG & TIỆN ÍCH */}
              <div className="pt-2 border-t border-[#EFE4D9]">
                <h4 className="text-xs font-bold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>3. Khung giờ phục vụ & Tiện ích kèm theo</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Giờ mở cửa
                    </label>
                    <input
                      type="time"
                      value={formData.openingTime}
                      onChange={(e) =>
                        setFormData({ ...formData, openingTime: e.target.value })
                      }
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Giờ đóng cửa
                    </label>
                    <input
                      type="time"
                      value={formData.closingTime}
                      onChange={(e) =>
                        setFormData({ ...formData, closingTime: e.target.value })
                      }
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Tiện ích cơ sở (Bấm để chọn/bỏ chọn)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableAmenities.map((amenity) => {
                      const isSelected = formData.amenities.includes(amenity);
                      return (
                        <div
                          key={amenity}
                          onClick={() => toggleAmenity(amenity)}
                          className={`p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#FAF0E4] border-[#985018] text-[#985018] ring-1 ring-[#985018]'
                              : 'bg-white border-[#E8DFD8] text-[#73675F] hover:border-[#D7BBA6]'
                          }`}
                        >
                          <span>{amenity}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#985018]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* PHẦN 4: HÌNH ẢNH CƠ SỞ & PHÂN BỔ PHÒNG MẶC ĐỊNH */}
              <div className="pt-2 border-t border-[#EFE4D9]">
                <h4 className="text-xs font-bold text-[#8A4F23] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>4. Ảnh đại diện & Phân bổ phòng dịch vụ</span>
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Đường dẫn hình ảnh cơ sở
                    </label>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018]"
                    />
                  </div>

                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#3E200C]">
                      <DoorOpen className="w-4 h-4 text-[#8A4F23]" />
                      <span>Sơ đồ phòng ốc:</span>
                    </div>
                    <p className="text-[11px] text-[#73675F] leading-relaxed">
                      Cơ sở mới sẽ khởi tạo với sơ đồ phòng trống. Bạn có thể chủ động cấu hình thêm các phòng trị liệu và phòng học thực tế ngay sau khi tạo cơ sở.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="pt-4 border-t border-[#EFE4D9] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang khởi tạo...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Khởi tạo chi nhánh mới</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: TẠO PHÒNG DỊCH VỤ TOÀN HỆ THỐNG (CROSS-BRANCH CREATE) */}
      {/* ============================================================== */}
      {isCrossBranchCreateRoomOpen && (
        <div
          onClick={() => {
            if (!isCrossBranchCreatingRoom) setIsCrossBranchCreateRoomOpen(false);
          }}
          className="fixed inset-0 bg-[#2C241E]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#EFE4D9] flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2C241E]">
                    Thêm phòng dịch vụ mới
                  </h3>
                  <p className="text-xs text-[#73675F]">
                    Bổ sung phòng vào hệ thống vận hành và phân bổ giường
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCrossBranchCreateRoomOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#8C7A6B] hover:text-[#2C241E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCrossBranchCreateRoom} className="p-6 space-y-4">
              {/* Chi nhánh */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Cơ sở chi nhánh <span className="text-[#985018]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={crossBranchCreateRoomForm.branchId}
                    onChange={(e) =>
                      setCrossBranchCreateRoomForm({
                        ...crossBranchCreateRoomForm,
                        branchId: e.target.value,
                      })
                    }
                    className="w-full appearance-none pl-9 pr-8 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Chọn chi nhánh áp dụng --
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Tên phòng */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Tên phòng dịch vụ <span className="text-[#985018]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={crossBranchCreateRoomForm.name}
                  onChange={(e) =>
                    setCrossBranchCreateRoomForm({
                      ...crossBranchCreateRoomForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="VD: Phòng VIP 01 - Hoa Sen"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20"
                />
              </div>

              {/* Grid: Loại phòng & Sức chứa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Loại phòng <span className="text-[#985018]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={crossBranchCreateRoomForm.roomType}
                      onChange={(e) =>
                        setCrossBranchCreateRoomForm({
                          ...crossBranchCreateRoomForm,
                          roomType: e.target.value as RoomType,
                        })
                      }
                      className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 cursor-pointer"
                    >
                      <option value="" disabled>
                        -- Chọn loại phòng --
                      </option>
                      {Object.entries(roomTypeLabels).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Sức chứa (giường) <span className="text-[#985018]">*</span>
                  </label>
                  <div className="relative">
                    <Bed className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min="1"
                      max="50"
                      value={crossBranchCreateRoomForm.bedCapacity}
                      onChange={(e) =>
                        setCrossBranchCreateRoomForm({
                          ...crossBranchCreateRoomForm,
                          bedCapacity: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      placeholder="VD: 2"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Trạng thái sử dụng */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#EFE4D9] flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-xs font-bold text-[#2C241E]">Có thể sử dụng đón khách</div>
                  <div className="text-[11px] text-[#73675F]">
                    Phòng sẽ xuất hiện trên sơ đồ điều phối và thu ngân POS
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCrossBranchCreateRoomForm({
                      ...crossBranchCreateRoomForm,
                      isAvailable: !crossBranchCreateRoomForm.isAvailable,
                    })
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                    crossBranchCreateRoomForm.isAvailable ? 'bg-[#985018]' : 'bg-[#D7C9BF]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      crossBranchCreateRoomForm.isAvailable ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCrossBranchCreateRoomOpen(false)}
                  className="px-4 py-2.5 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCrossBranchCreatingRoom}
                  className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isCrossBranchCreatingRoom ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tạo phòng...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Thêm phòng dịch vụ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CHỈNH SỬA PHÒNG DỊCH VỤ TOÀN HỆ THỐNG (EDIT ROOM)   */}
      {/* ============================================================== */}
      {isCrossBranchEditRoomOpen && editingCrossBranchRoom && (
        <div
          onClick={() => {
            if (!isCrossBranchEditingRoom) {
              setIsCrossBranchEditRoomOpen(false);
              setEditingCrossBranchRoom(null);
            }
          }}
          className="fixed inset-0 bg-[#2C241E]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#EFE4D9] flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2C241E]">
                    Chỉnh sửa phòng dịch vụ
                  </h3>
                  <p className="text-xs text-[#73675F]">
                    Cập nhật thông tin phòng:{' '}
                    <span className="font-semibold text-[#985018]">
                      {editingCrossBranchRoom.name}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCrossBranchEditRoomOpen(false);
                  setEditingCrossBranchRoom(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#8C7A6B] hover:text-[#2C241E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCrossBranchEditRoom} className="p-6 space-y-4">
              {/* Cơ sở */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Cơ sở chi nhánh <span className="text-[#985018]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={crossBranchEditRoomForm.branchId}
                    onChange={(e) =>
                      setCrossBranchEditRoomForm({
                        ...crossBranchEditRoomForm,
                        branchId: e.target.value,
                      })
                    }
                    className="w-full appearance-none pl-9 pr-8 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Tên phòng */}
              <div>
                <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                  Tên phòng dịch vụ <span className="text-[#985018]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={crossBranchEditRoomForm.name}
                  onChange={(e) =>
                    setCrossBranchEditRoomForm({
                      ...crossBranchEditRoomForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="VD: Phòng VIP 01 - Hoa Sen"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20"
                />
              </div>

              {/* Grid: Loại phòng & Sức chứa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Loại phòng <span className="text-[#985018]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={crossBranchEditRoomForm.roomType}
                      onChange={(e) =>
                        setCrossBranchEditRoomForm({
                          ...crossBranchEditRoomForm,
                          roomType: e.target.value as RoomType,
                        })
                      }
                      className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20 cursor-pointer"
                    >
                      {Object.entries(roomTypeLabels).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                    Sức chứa (giường) <span className="text-[#985018]">*</span>
                  </label>
                  <div className="relative">
                    <Bed className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min="1"
                      max="50"
                      value={crossBranchEditRoomForm.bedCapacity}
                      onChange={(e) =>
                        setCrossBranchEditRoomForm({
                          ...crossBranchEditRoomForm,
                          bedCapacity: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Trạng thái sử dụng */}
              <div className="p-3.5 bg-white rounded-2xl border border-[#EFE4D9] flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-xs font-bold text-[#2C241E]">Có thể sử dụng đón khách</div>
                  <div className="text-[11px] text-[#73675F]">
                    {crossBranchEditRoomForm.isAvailable
                      ? 'Phòng đang mở cửa tiếp nhận đặt hẹn và xếp lịch trị liệu'
                      : 'Phòng đang tạm ngưng đón khách (bảo trì hoặc tạm đóng)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCrossBranchEditRoomForm({
                      ...crossBranchEditRoomForm,
                      isAvailable: !crossBranchEditRoomForm.isAvailable,
                    })
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                    crossBranchEditRoomForm.isAvailable ? 'bg-[#985018]' : 'bg-[#D7C9BF]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      crossBranchEditRoomForm.isAvailable ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#EFE4D9] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCrossBranchEditRoomOpen(false);
                    setEditingCrossBranchRoom(null);
                  }}
                  className="px-4 py-2.5 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCrossBranchEditingRoom}
                  className="px-6 py-2.5 bg-[#985018] hover:bg-[#854412] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isCrossBranchEditingRoom ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: XEM CHI TIẾT PHÒNG DỊCH VỤ (VIEW ROOM DETAILS)        */}
      {/* ============================================================== */}
      {isCrossBranchViewRoomOpen && viewingCrossBranchRoom && (
        <div
          onClick={() => {
            setIsCrossBranchViewRoomOpen(false);
            setViewingCrossBranchRoom(null);
          }}
          className="fixed inset-0 bg-[#2C241E]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#EFE4D9] flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF0E4] text-[#8A4F23] flex items-center justify-center">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2C241E]">
                    {viewingCrossBranchRoom.name}
                  </h3>
                  <p className="text-xs text-[#73675F]">
                    {viewingCrossBranchRoom.branchName || 'Cơ sở MLD'} (
                    {viewingCrossBranchRoom.branchCode || viewingCrossBranchRoom.branchId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCrossBranchViewRoomOpen(false);
                  setViewingCrossBranchRoom(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#8C7A6B] hover:text-[#2C241E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              {/* Badge status */}
              <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#EFE4D9] shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2C241E]">Trạng thái vận hành:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      viewingCrossBranchRoom.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        viewingCrossBranchRoom.isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    {viewingCrossBranchRoom.isAvailable ? 'Có thể sử dụng' : 'Tạm ngưng đón khách'}
                  </span>
                </div>
                <div className="text-xs text-[#8C7A6B]">
                  Sức chứa:{' '}
                  <span className="font-bold text-[#2C241E]">
                    {viewingCrossBranchRoom.bedCapacity} giường
                  </span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-[#EFE4D9] space-y-1">
                  <div className="text-[11px] font-semibold text-[#8C7A6B]">Phân loại dịch vụ</div>
                  <div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getRoomTypeBadgeStyle(
                        viewingCrossBranchRoom.roomType
                      )}`}
                    >
                      {roomTypeLabels[viewingCrossBranchRoom.roomType] ||
                        viewingCrossBranchRoom.roomType}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#EFE4D9] space-y-1">
                  <div className="text-[11px] font-semibold text-[#8C7A6B]">Cơ sở trực thuộc</div>
                  <div className="text-xs font-bold text-[#2C241E] truncate">
                    {viewingCrossBranchRoom.branchName || 'MLD Beauty & Spa'}
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#EFE4D9] space-y-1">
                  <div className="text-[11px] font-semibold text-[#8C7A6B]">Mã định danh (ID)</div>
                  <div className="text-xs font-mono text-[#5C4D42] truncate">
                    {viewingCrossBranchRoom.id}
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#EFE4D9] space-y-1">
                  <div className="text-[11px] font-semibold text-[#8C7A6B]">Thời gian tạo</div>
                  <div className="text-xs text-[#5C4D42]">
                    {viewingCrossBranchRoom.createdAt
                      ? new Date(viewingCrossBranchRoom.createdAt).toLocaleDateString('vi-VN')
                      : 'Hệ thống chuẩn'}
                  </div>
                </div>
              </div>

              {/* Database Preservation Banner */}
              <div className="p-3.5 bg-[#FAF0E4]/60 rounded-2xl border border-[#E8DFD8] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#985018] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#73675F] leading-relaxed">
                  <span className="font-bold text-[#3E200C]">Chính sách lưu trữ cơ sở dữ liệu:</span>{' '}
                  Phòng được đồng bộ thực tế trên Supabase Cloud. Khi xóa, hệ thống sẽ thực hiện Soft-Delete lưu trữ an toàn nhằm bảo vệ lịch sử phân ca và phiếu liệu trình liên quan.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-[#EFE4D9] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsCrossBranchViewRoomOpen(false);
                  setViewingCrossBranchRoom(null);
                }}
                className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const roomToEdit = viewingCrossBranchRoom;
                  setIsCrossBranchViewRoomOpen(false);
                  setViewingCrossBranchRoom(null);
                  handleOpenCrossBranchEditRoom(roomToEdit);
                }}
                className="px-5 py-2 bg-[#985018] hover:bg-[#854412] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Chỉnh sửa phòng này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: XÁC NHẬN XÓA CHI NHÁNH (SOFT DELETE - PRESERVE CSDL) */}
      {/* ============================================================== */}
      {isDeleteBranchModalOpen && branchToDelete && (
        <div
          onClick={() => {
            if (!isDeletingBranch) {
              setIsDeleteBranchModalOpen(false);
              setBranchToDelete(null);
            }
          }}
          className="fixed inset-0 bg-[#2C241E]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF8F5] rounded-3xl max-w-md w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#EFE4D9] flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2C241E]">
                    Xác nhận xóa chi nhánh
                  </h3>
                  <p className="text-xs text-[#73675F]">
                    Ẩn cơ sở khỏi hệ thống và bảo toàn dữ liệu trong CSDL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteBranchModalOpen(false);
                  setBranchToDelete(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#8C7A6B] hover:text-[#2C241E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-[#EFE4D9] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#2C241E]">{branchToDelete.name}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FAF0E4] text-[#8A4F23]">
                    {branchToDelete.code}
                  </span>
                </div>
                <div className="text-xs text-[#73675F]">
                  {branchToDelete.address}, {branchToDelete.district}, {branchToDelete.city}
                </div>
                <div className="text-[11px] text-[#8C7A6B]">
                  Hotline tiếp đón: <span className="font-semibold text-[#2C241E]">{branchToDelete.phone}</span>
                </div>
              </div>

              {/* Policy alert */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>Chính sách lưu trữ cơ sở dữ liệu:</strong> Khi xóa, cơ sở sẽ được ẩn khỏi danh sách vận hành, phân ca KTV và màn hình thu ngân POS. Bản ghi cơ sở cùng toàn bộ lịch sử hóa đơn, phiếu liệu trình và lịch hẹn <strong>vẫn được bảo toàn nguyên vẹn 100% trong CSDL</strong> và có thể khôi phục lại bất kỳ lúc nào.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-[#EFE4D9] flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeletingBranch}
                onClick={() => {
                  setIsDeleteBranchModalOpen(false);
                  setBranchToDelete(null);
                }}
                className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingBranch}
                onClick={handleConfirmDeleteBranch}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingBranch ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa chi nhánh</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: XÁC NHẬN XÓA PHÒNG DỊCH VỤ (SOFT DELETE - PRESERVE CSDL) */}
      {/* ============================================================== */}
      {isDeleteRoomModalOpen && roomToDelete && (
        <div
          onClick={() => {
            if (!isDeletingRoom) {
              setIsDeleteRoomModalOpen(false);
              setRoomToDelete(null);
            }
          }}
          className="fixed inset-0 bg-[#2C241E]/50 backdrop-blur-xs flex items-center justify-center z-[60] p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF8F5] rounded-3xl max-w-md w-full border border-[#EFE4D9] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#EFE4D9] flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2C241E]">
                    Xác nhận xóa phòng dịch vụ
                  </h3>
                  <p className="text-xs text-[#73675F]">
                    Ẩn phòng khỏi hệ thống và bảo toàn dữ liệu trong CSDL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteRoomModalOpen(false);
                  setRoomToDelete(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-[#FAF8F5] flex items-center justify-center text-[#8C7A6B] hover:text-[#2C241E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-[#EFE4D9] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#2C241E]">{roomToDelete.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${getRoomTypeBadgeStyle(
                      roomToDelete.roomType
                    )}`}
                  >
                    {roomTypeLabels[roomToDelete.roomType] || roomToDelete.roomType}
                  </span>
                </div>
                <div className="text-xs text-[#73675F] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#985018]" />
                  <span>
                    {roomToDelete.branchName || 'Cơ sở MLD'}{' '}
                    {roomToDelete.branchCode ? `(${roomToDelete.branchCode})` : ''}
                  </span>
                </div>
                <div className="text-[11px] text-[#8C7A6B] flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-[#8C7A6B]" />
                  <span>
                    Sức chứa:{' '}
                    <strong className="text-[#2C241E]">{roomToDelete.bedCapacity} giường trị liệu</strong>
                  </span>
                </div>
              </div>

              {/* Policy alert */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>Chính sách lưu trữ cơ sở dữ liệu:</strong> Khi xóa, phòng sẽ được ẩn khỏi hệ thống vận hành, sơ đồ phòng và không tiếp nhận đặt hẹn mới. Dữ liệu phòng cùng toàn bộ lịch sử sử dụng phòng <strong>vẫn được bảo toàn nguyên vẹn 100% trong CSDL Supabase</strong> và có thể khôi phục lại bất kỳ lúc nào.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-[#EFE4D9] flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeletingRoom}
                onClick={() => {
                  setIsDeleteRoomModalOpen(false);
                  setRoomToDelete(null);
                }}
                className="px-4 py-2 border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#73675F] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingRoom}
                onClick={handleConfirmDeleteRoom}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingRoom ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa phòng</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
