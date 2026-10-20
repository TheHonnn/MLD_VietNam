// MLD Healthcare & Spa - W02 Branch Management & Facility Configuration
import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { branchService, treatmentService } from '../services';
import { toast } from '../components/common';
import { Branch, BranchRoom, Service, RoomType } from '../types/shared_types';
import { matchSearch } from '../utils/searchUtils';
import { VIETNAM_LOCATIONS_2026, VIETNAM_PROVINCE_NAMES } from '../data/vietnamLocations';

const roomTypeLabels: Record<string, string> = {
  VIP_ROOM: 'Phòng VIP Hoàng Gia',
  MASSAGE_ROOM: 'Phòng Massage Trị Liệu',
  HEAD_SPA_ROOM: 'Phòng Dưỡng Sinh Head Spa',
  SKINCARE_ROOM: 'Phòng Skincare Chuyên Sâu',
  ACADEMY_CLASSROOM: 'Phòng Học Lý Thuyết Academy',
  PRACTICE_LAB: 'Phòng Thực Hành Lâm Sàng Lab',
};

export const W02_Branches: React.FC = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('b-q3');
  const [rooms, setRooms] = useState<BranchRoom[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    roomType: 'VIP_ROOM' as RoomType,
    bedCapacity: 2,
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brRes, srvRes] = await Promise.all([
          branchService.getAllBranches(),
          treatmentService.getServices(),
        ]);

        let allBranches = brRes.success && brRes.data.length > 0 ? brRes.data : [];

        // Merge with local storage branches
        try {
          const stored = localStorage.getItem('mld_custom_branches');
          if (stored) {
            const parsed: Branch[] = JSON.parse(stored);
            const remoteIds = new Set(allBranches.map((b) => b.id));
            const newCustom = parsed.filter((b) => !remoteIds.has(b.id));
            allBranches = [...newCustom, ...allBranches];
          }
        } catch {}

        setBranches(allBranches);
        if (allBranches.length > 0) {
          const preferredBranch =
            localStorage.getItem('mld_selected_branch_id') || allBranches[0].id;
          const targetId = allBranches.some((b) => b.id === preferredBranch)
            ? preferredBranch
            : allBranches[0].id;
          setSelectedBranchId(targetId);

          const roomRes = await branchService.getRoomsByBranch(targetId);
          if (roomRes.success && roomRes.data.length > 0) {
            setRooms(roomRes.data);
          } else {
            loadRoomsForBranch(targetId);
          }
        }
        if (srvRes.success) setServices(srvRes.data);
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const loadRoomsForBranch = (branchId: string) => {
    const cached = localStorage.getItem(`mld_rooms_${branchId}`);
    if (cached) {
      try {
        setRooms(JSON.parse(cached));
        return;
      } catch {}
    }
    const defaultRooms: BranchRoom[] = [
      {
        id: `r-${branchId}-1`,
        branchId,
        name: 'Phòng VIP Hoàng Gia',
        roomType: 'VIP_ROOM' as any,
        bedCapacity: 2,
        isAvailable: true,
      },
      {
        id: `r-${branchId}-2`,
        branchId,
        name: 'Phòng Trị Liệu Vodder 01',
        roomType: 'MASSAGE_ROOM' as any,
        bedCapacity: 4,
        isAvailable: true,
      },
      {
        id: `r-${branchId}-3`,
        branchId,
        name: 'Phòng Skincare Hydrafacial',
        roomType: 'SKINCARE_ROOM' as any,
        bedCapacity: 3,
        isAvailable: true,
      },
    ];
    setRooms(defaultRooms);
  };

  const handleSelectBranch = async (branchId: string) => {
    setSelectedBranchId(branchId);
    try {
      const roomRes = await branchService.getRoomsByBranch(branchId);
      if (roomRes.success && roomRes.data.length > 0) {
        // Merge with any locally added rooms in localStorage
        const cached = localStorage.getItem(`mld_rooms_${branchId}`);
        if (cached) {
          try {
            const localRooms: BranchRoom[] = JSON.parse(cached);
            const liveIds = new Set(roomRes.data.map((r) => r.id));
            const merged = [...roomRes.data];
            for (const lr of localRooms) {
              if (!liveIds.has(lr.id)) {
                merged.push(lr);
              }
            }
            setRooms(merged);
            return;
          } catch {}
        }
        setRooms(roomRes.data);
      } else {
        loadRoomsForBranch(branchId);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
      loadRoomsForBranch(branchId);
    }
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
            if (!liveIds.has(lr.id)) {
              branchRooms.push(lr);
            }
          }
        } catch {}
      }
      if (branchRooms.length === 0) {
        branchRooms = rooms.length > 0 && selectedBranchId === branch.id ? rooms : [
          {
            id: `r-${branch.id}-1`,
            branchId: branch.id,
            name: 'Phòng VIP Hoàng Gia',
            roomType: 'VIP_ROOM' as RoomType,
            bedCapacity: 2,
            isAvailable: true,
          },
          {
            id: `r-${branch.id}-2`,
            branchId: branch.id,
            name: 'Phòng Trị Liệu Vodder 01',
            roomType: 'MASSAGE_ROOM' as RoomType,
            bedCapacity: 4,
            isAvailable: true,
          },
          {
            id: `r-${branch.id}-3`,
            branchId: branch.id,
            name: 'Phòng Skincare Hydrafacial',
            roomType: 'SKINCARE_ROOM' as RoomType,
            bedCapacity: 3,
            isAvailable: true,
          },
        ];
      }
      setManageRooms(branchRooms);
      setArchivedRooms(archRes.success ? archRes.data : []);
    } catch {
      setManageRooms(rooms);
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
    if (!newRoomData.name.trim() || !managingBranch) {
      toast.error('Thiếu thông tin phòng', 'Vui lòng nhập tên phòng.');
      return;
    }

    setIsAddingRoom(true);
    try {
      const res = await branchService.createRoom({
        branchId: managingBranch.id,
        name: newRoomData.name.trim(),
        roomType: newRoomData.roomType,
        bedCapacity: Number(newRoomData.bedCapacity) || 1,
        isAvailable: newRoomData.isAvailable,
      });

      const newRoom: BranchRoom = (res.success && res.data)
        ? res.data
        : {
            id: `r-${managingBranch.id}-${Date.now()}`,
            branchId: managingBranch.id,
            name: newRoomData.name.trim(),
            roomType: newRoomData.roomType,
            bedCapacity: Number(newRoomData.bedCapacity) || 1,
            isAvailable: newRoomData.isAvailable,
          };

      const updated = [...manageRooms, newRoom];
      setManageRooms(updated);
      localStorage.setItem(`mld_rooms_${managingBranch.id}`, JSON.stringify(updated));
      if (selectedBranchId === managingBranch.id) {
        setRooms(updated);
      }
      setNewRoomData({
        name: '',
        roomType: 'VIP_ROOM' as RoomType,
        bedCapacity: 2,
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
        roomType: newRoomData.roomType,
        bedCapacity: Number(newRoomData.bedCapacity) || 1,
        isAvailable: newRoomData.isAvailable,
      };
      const updated = [...manageRooms, fallbackRoom];
      setManageRooms(updated);
      localStorage.setItem(`mld_rooms_${managingBranch.id}`, JSON.stringify(updated));
      if (selectedBranchId === managingBranch.id) {
        setRooms(updated);
      }
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
    if (selectedBranchId === managingBranch.id) {
      setRooms(updated);
    }
    await branchService.updateRoom(roomId, { isAvailable: nextAvail });
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!managingBranch) return;
    const target = manageRooms.find((r) => r.id === roomId);
    if (!target) return;

    // 1. Gỡ khỏi danh sách phòng hoạt động trên hệ thống
    const updated = manageRooms.filter((r) => r.id !== roomId);
    setManageRooms(updated);
    localStorage.setItem(`mld_rooms_${managingBranch.id}`, JSON.stringify(updated));
    if (selectedBranchId === managingBranch.id) {
      setRooms(updated);
    }

    // 2. Đưa vào danh sách phòng lưu trữ trong CSDL (Soft Delete)
    const archivedTarget: BranchRoom = {
      ...target,
      isAvailable: false,
      isArchived: true,
      archivedAt: new Date().toISOString(),
    };
    setArchivedRooms((prev) => [archivedTarget, ...prev.filter((r) => r.id !== roomId)]);

    toast.success(
      'Đã xóa phòng khỏi hệ thống',
      `Phòng "${target.name}" đã được ẩn khỏi hệ thống vận hành. Bản ghi vẫn được bảo toàn nguyên vẹn trong cơ sở dữ liệu.`
    );

    // 3. Cập nhật soft-delete trên Supabase Cloud (PATCH [ARCHIVED] thay vì DELETE)
    await branchService.deleteRoom(roomId);
  };

  const handleRestoreRoom = async (roomId: string) => {
    if (!managingBranch) return;
    const target = archivedRooms.find((r) => r.id === roomId);
    if (!target) return;

    // 1. Gỡ khỏi danh sách lưu trữ CSDL
    setArchivedRooms((prev) => prev.filter((r) => r.id !== roomId));

    // 2. Khôi phục lại danh sách phòng hoạt động trên hệ thống
    const restoredTarget: BranchRoom = {
      ...target,
      isAvailable: true,
      isArchived: false,
    };
    const updated = [...manageRooms, restoredTarget];
    setManageRooms(updated);
    localStorage.setItem(`mld_rooms_${managingBranch.id}`, JSON.stringify(updated));
    if (selectedBranchId === managingBranch.id) {
      setRooms(updated);
    }

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
      if (selectedBranchId === managingBranch.id) {
        setRooms(manageRooms);
      }

      toast.success('Cập nhật cơ sở thành công', `Đã lưu thông tin cơ sở ${editForm.name}.`);
      setIsManageModalOpen(false);
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

      // Create default rooms for this branch
      const newRooms: BranchRoom[] = [
        {
          id: `r-${createdBranch.id}-1`,
          branchId: createdBranch.id,
          name: 'Phòng VIP Hoàng Gia',
          roomType: 'VIP_ROOM' as any,
          bedCapacity: 2,
          isAvailable: true,
        },
        {
          id: `r-${createdBranch.id}-2`,
          branchId: createdBranch.id,
          name: 'Phòng Trị Liệu Vodder 01',
          roomType: 'MASSAGE_ROOM' as any,
          bedCapacity: 4,
          isAvailable: true,
        },
        {
          id: `r-${createdBranch.id}-3`,
          branchId: createdBranch.id,
          name: 'Phòng Skincare Hydrafacial',
          roomType: 'SKINCARE_ROOM' as any,
          bedCapacity: 3,
          isAvailable: true,
        },
      ];
      localStorage.setItem(`mld_rooms_${createdBranch.id}`, JSON.stringify(newRooms));
      setRooms(newRooms);

      toast.success(
        'Thêm chi nhánh thành công',
        `Cơ sở ${createdBranch.name} (${createdBranch.code}) đã được kích hoạt thành công trên hệ thống.`
      );
      setIsCreateModalOpen(false);

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

  const hasActiveFilter = searchTerm.trim().length > 0 || selectedCity !== 'ALL' || selectedStatus !== 'ALL';

  const filteredBranches = branches.filter((b) => {
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

  const selectedBranch =
    filteredBranches.find((b) => b.id === selectedBranchId) ||
    filteredBranches[0] ||
    branches.find((b) => b.id === selectedBranchId) ||
    branches[0];

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif] text-[#2C241E]">
      {/* 1. Page Header Title & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#3E200C] tracking-tight leading-tight">
            Quản lý chi nhánh
          </h1>
          <p className="text-[12px] text-[#73675F] mt-1 font-medium">
            Danh mục cơ sở, dịch vụ và cấu hình vận hành trực tuyến từ Service Layer.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm chi nhánh</span>
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#EFE4D9] flex flex-wrap items-center gap-2.5 shadow-xs">
        <div className="relative flex-1 min-w-[220px] w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, mã, quận huyện hoặc địa chỉ chi nhánh..."
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

        {/* City Filter */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full sm:w-auto h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018]"
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

        {/* Status Filter */}
        <div className="relative shrink-0 flex-1 sm:flex-none">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-auto h-10 pl-3 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors appearance-none focus:outline-none focus:border-[#985018]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm dừng đón khách</option>
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
          onClick={() => navigate('/treatment-management')}
          className="flex items-center justify-between gap-2 px-3.5 h-10 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors shrink-0 flex-1 sm:flex-none cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8C7A6B]" />
          <span>{services.length || 3} dịch vụ spa</span>
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
            <thead className="bg-[#F4ECE3] text-[#695A4E] text-[11px] font-bold">
              <tr>
                <th className="py-2.5 px-5">Cơ sở & địa chỉ</th>
                <th className="py-2.5 px-4">Giờ mở cửa</th>
                <th className="py-2.5 px-4">Tiện ích / dịch vụ</th>
                <th className="py-2.5 px-4">Số điện thoại</th>
                <th className="py-2.5 px-6 text-center">Trạng thái / thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9]">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#73675F]">
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
                filteredBranches.map((branch) => {
                  const isSelected = branch.id === selectedBranchId;
                  return (
                    <tr
                      key={branch.id}
                      onClick={() => handleSelectBranch(branch.id)}
                      className={`cursor-pointer ${
                        isSelected ? 'bg-[#F8F1E8]' : 'bg-white'
                      } hover:bg-[#FAF6F0] transition-colors`}
                    >
                    {/* Name & Address */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2C241E]">{branch.name}</span>
                        {branch.code && (
                          <span className="text-[9.5px] px-1.5 py-0.2 bg-[#FAF0E4] text-[#8A4F23] rounded font-mono font-bold">
                            {branch.code}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#8C7A6B] mt-0.5">{branch.address}</div>
                    </td>

                    {/* Open Hours */}
                    <td className="py-3.5 px-4 font-semibold text-[#2C241E] whitespace-nowrap">
                      {branch.openingTime ? branch.openingTime.slice(0, 5) : '08:30'}–
                      {branch.closingTime ? branch.closingTime.slice(0, 5) : '20:30'}
                    </td>

                    {/* Amenities / Services */}
                    <td className="py-3.5 px-4">
                      {branch.amenities && branch.amenities.length > 0 ? (
                        branch.amenities.map((a, aIdx) => (
                          <div key={aIdx} className="text-xs text-[#2C241E] leading-relaxed">
                            • {a}
                          </div>
                        ))
                      ) : (
                        <span className="text-[#8C7A6B]">Tiêu chuẩn MLD Spa</span>
                      )}
                    </td>

                    {/* Resources */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#2C241E]">{branch.phone}</div>
                      <div className="text-[11px] text-[#8C7A6B] mt-0.5">
                        {branch.district}, {branch.city}
                      </div>
                    </td>

                    {/* Status & Action */}
                    <td className="py-3.5 px-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <span
                          className={`inline-block px-3 py-1 rounded-lg text-[11px] font-semibold ${
                            branch.isActive
                              ? 'bg-[#F3E2CE] text-[#8A4F23]'
                              : 'bg-[#FBEBEB] text-[#B83E3E]'
                          }`}
                        >
                          {branch.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenManageModal(branch);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-[#8A4F23] hover:text-[#985018] hover:bg-[#FAF0E4] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Settings className="w-3 h-3" />
                          <span>Quản lý cơ sở</span>
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
        <div className="p-3 bg-white border-t border-[#EFE4D9] flex items-center justify-between text-xs text-[#8A796B]">
          <span className="text-[11px]">
            Hiển thị {filteredBranches.length} / {branches.length} cơ sở
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled
              className="w-6 h-6 rounded-md flex items-center justify-center bg-[#F4ECE3] text-[#A69788] opacity-60 cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="w-6 h-6 rounded-md flex items-center justify-center bg-[#E6D4C3] text-[#783D19] font-bold text-[11px]">
              1
            </button>
            <button
              disabled
              className="w-6 h-6 rounded-md flex items-center justify-center bg-[#F4ECE3] text-[#A69788] opacity-60 cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

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
                <button
                  type="button"
                  onClick={() => handleOpenManageModal(selectedBranch)}
                  className="px-3 py-1.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Quản lý cơ sở này</span>
                </button>
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
                    className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#2C241E]">{r.name}</div>
                      <div className="text-[10px] text-[#8C7A6B]">
                        {roomTypeLabels[r.roomType] || r.roomType} • {r.bedCapacity} giường
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.isAvailable
                          ? 'bg-[#E8EFE5] text-[#526D51]'
                          : 'bg-[#FBEBEB] text-[#B83E3E]'
                      }`}
                    >
                      {r.isAvailable ? 'Sẵn sàng' : 'Đang bận'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Modal Quản Lý Cơ Sở Chi Nhánh (Full Interactive Management Modal) */}
      {isManageModalOpen && managingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
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
                          Tên phòng
                        </label>
                        <input
                          type="text"
                          required
                          value={newRoomData.name}
                          onChange={(e) =>
                            setNewRoomData({ ...newRoomData, name: e.target.value })
                          }
                          placeholder="VD: Phòng VIP 02"
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#2C241E] mb-1">
                          Loại phòng
                        </label>
                        <select
                          value={newRoomData.roomType}
                          onChange={(e) =>
                            setNewRoomData({
                              ...newRoomData,
                              roomType: e.target.value as RoomType,
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-xs"
                        >
                          {Object.entries(roomTypeLabels).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#2C241E] mb-1">
                          Số giường
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={newRoomData.bedCapacity}
                          onChange={(e) =>
                            setNewRoomData({
                              ...newRoomData,
                              bedCapacity: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-[#E8DFD8] rounded-lg text-xs"
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
                <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EFE4D9] space-y-2">
                  <h4 className="font-bold text-xs text-[#2C241E]">
                    Chuyển cơ sở làm việc chính trên toàn hệ thống
                  </h4>
                  <p className="text-[11px] text-[#73675F] leading-relaxed">
                    Đặt cơ sở <strong>"{managingBranch.name}"</strong> làm chi nhánh làm việc
                    mặc định cho tài khoản của bạn trên tất cả trang Tổng quan, Lịch hẹn và Thu ngân.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectBranch(managingBranch.id);
                      localStorage.setItem('mld_selected_branch_id', managingBranch.id);
                      window.dispatchEvent(
                        new CustomEvent('mld_branch_changed', {
                          detail: { branchId: managingBranch.id },
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div
                    onClick={() => {
                      handleSelectBranch(managingBranch.id);
                      localStorage.setItem('mld_selected_branch_id', managingBranch.id);
                      navigate('/staff-schedule');
                    }}
                    className="p-4 bg-white rounded-2xl border border-[#EFE4D9] hover:border-[#985018] transition-all cursor-pointer shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#2C241E]">Lịch kỹ thuật viên</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#985018]" />
                    </div>
                    <p className="text-[11px] text-[#8C7A6B]">
                      Xem sơ đồ phân ca và xếp lịch chuyên viên tại cơ sở này.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      handleSelectBranch(managingBranch.id);
                      localStorage.setItem('mld_selected_branch_id', managingBranch.id);
                      navigate('/cashier-pos');
                    }}
                    className="p-4 bg-white rounded-2xl border border-[#EFE4D9] hover:border-[#985018] transition-all cursor-pointer shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#2C241E]">Thu ngân POS cơ sở</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#985018]" />
                    </div>
                    <p className="text-[11px] text-[#8C7A6B]">
                      Mở bàn thanh toán và xuất hóa đơn dịch vụ cho chi nhánh.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Modal Thêm Chi Nhánh Mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241E]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#EFE4D9] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
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

                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#3E200C]">
                      <DoorOpen className="w-4 h-4 text-[#8A4F23]" />
                      <span>Tự động thiết lập 3 phòng trị liệu tiêu chuẩn ban đầu:</span>
                    </div>
                    <ul className="text-[11px] text-[#73675F] space-y-1 pl-5 list-disc">
                      <li>
                        <strong>Phòng VIP Hoàng Gia</strong>: 2 giường trị liệu cao cấp
                      </li>
                      <li>
                        <strong>Phòng Trị Liệu Vodder 01</strong>: 4 giường massage bạch huyết
                      </li>
                      <li>
                        <strong>Phòng Skincare Hydrafacial</strong>: 3 giường chăm sóc chuyên sâu
                      </li>
                    </ul>
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
    </div>
  );
};
