// MLD Healthcare & Spa - W02 Branch Management & Facility Configuration
import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { branchService, treatmentService } from '../services';
import { toast } from '../components/common';
import { Branch, BranchRoom, Service } from '../types/shared_types';

export const W02_Branches: React.FC = () => {
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

  const cityOptions = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ'];

  const districtPresets = [
    'Quận 1',
    'Quận 3',
    'Quận 5',
    'Quận 7',
    'Quận 10',
    'Bình Thạnh',
    'Phú Nhuận',
    'Gò Vấp',
    'Tân Bình',
    'TP. Thủ Đức',
  ];

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
          setSelectedBranchId(allBranches[0].id);
          const roomRes = await branchService.getRoomsByBranch(allBranches[0].id);
          if (roomRes.success && roomRes.data.length > 0) {
            setRooms(roomRes.data);
          } else {
            loadRoomsForBranch(allBranches[0].id);
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
      { id: `r-${branchId}-1`, branchId, name: 'Phòng VIP Hoàng Gia', roomType: 'VIP_ROOM' as any, bedCapacity: 2, isAvailable: true },
      { id: `r-${branchId}-2`, branchId, name: 'Phòng Trị Liệu Vodder 01', roomType: 'MASSAGE_ROOM' as any, bedCapacity: 4, isAvailable: true },
      { id: `r-${branchId}-3`, branchId, name: 'Phòng Skincare Hydrafacial', roomType: 'SKINCARE_ROOM' as any, bedCapacity: 3, isAvailable: true },
    ];
    setRooms(defaultRooms);
  };

  const handleSelectBranch = async (branchId: string) => {
    setSelectedBranchId(branchId);
    try {
      const roomRes = await branchService.getRoomsByBranch(branchId);
      if (roomRes.success && roomRes.data.length > 0) {
        setRooms(roomRes.data);
      } else {
        loadRoomsForBranch(branchId);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
      loadRoomsForBranch(branchId);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      // Auto-generate code if code is blank or follows auto-pattern
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
        amenities: formData.amenities.length > 0 ? formData.amenities : ['Phòng VIP riêng biệt', 'Đỗ xe ô tô miễn phí', 'Trà thảo mộc & bánh ngọt'],
        isActive: true,
      };

      const res = await branchService.createBranch(branchPayload);
      const createdBranch = res.data;

      // 1. Update state
      const updatedList = [createdBranch, ...branches];
      setBranches(updatedList);
      setSelectedBranchId(createdBranch.id);

      // 2. Persist to localStorage
      try {
        const stored = localStorage.getItem('mld_custom_branches');
        const customArr: Branch[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem('mld_custom_branches', JSON.stringify([createdBranch, ...customArr]));
      } catch {}

      // 3. Create default rooms for this branch
      const newRooms: BranchRoom[] = [
        { id: `r-${createdBranch.id}-1`, branchId: createdBranch.id, name: 'Phòng VIP Hoàng Gia', roomType: 'VIP_ROOM' as any, bedCapacity: 2, isAvailable: true },
        { id: `r-${createdBranch.id}-2`, branchId: createdBranch.id, name: 'Phòng Trị Liệu Vodder 01', roomType: 'MASSAGE_ROOM' as any, bedCapacity: 4, isAvailable: true },
        { id: `r-${createdBranch.id}-3`, branchId: createdBranch.id, name: 'Phòng Skincare Hydrafacial', roomType: 'SKINCARE_ROOM' as any, bedCapacity: 3, isAvailable: true },
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

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  const filteredBranches = branches.filter((b) => {
    // City filter
    if (selectedCity !== 'ALL' && !b.city.toLowerCase().includes(selectedCity.toLowerCase())) {
      return false;
    }
    // Status filter
    if (selectedStatus === 'ACTIVE' && !b.isActive) return false;
    if (selectedStatus === 'INACTIVE' && b.isActive) return false;

    // Search term
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.name.toLowerCase().includes(term) ||
      b.address.toLowerCase().includes(term) ||
      b.code.toLowerCase().includes(term) ||
      b.district.toLowerCase().includes(term)
    );
  });


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
          className="px-5 py-2.5 bg-[#985018] hover:bg-[#854412] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm chi nhánh</span>
        </button>
      </div>

      {/* 2. Filter Bar Box */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#EFE4D9] flex flex-col md:flex-row items-stretch md:items-center gap-2.5 shadow-xs">
        {/* Search input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên, mã, quận huyện hoặc địa chỉ chi nhánh..."
            className="w-full h-10 px-3.5 bg-white border border-[#E0D7CC] rounded-xl text-xs text-[#2C241E] placeholder-[#A69788] focus:outline-none focus:border-[#985018]"
          />
        </div>

        {/* City dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="h-10 pl-3.5 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors focus:outline-none focus:border-[#985018] appearance-none cursor-pointer"
          >
            <option value="ALL">Tất cả tỉnh / thành phố ({branches.length})</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 pl-3.5 pr-8 rounded-xl border border-[#E0D7CC] bg-white text-xs font-medium text-[#4A3E34] hover:bg-[#FAF8F5] transition-colors focus:outline-none focus:border-[#985018] appearance-none cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm dừng</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C7A6B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Service stats badge */}
        <div className="flex items-center gap-2 px-3.5 h-10 rounded-xl border border-[#E0D7CC] bg-[#FAF8F5] text-xs font-medium text-[#4A3E34] shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[#8A4F23]" />
          <span>{services.length} dịch vụ spa</span>
        </div>
      </div>

      {/* 3. Table Card: Danh sách chi nhánh */}
      <div className="bg-white rounded-2xl border border-[#EFE4D9] overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#2C241E]">Danh sách chi nhánh</h3>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#F3E2CE] text-[#8A4F23]">
            {filteredBranches.length} cơ sở
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F3E2CE] text-[#73675F] text-[11.5px] font-medium">
              <tr>
                <th className="py-3 px-5 font-medium">Cơ sở & địa chỉ</th>
                <th className="py-3 px-4 font-medium">Giờ mở cửa</th>
                <th className="py-3 px-4 font-medium">Tiện ích / dịch vụ</th>
                <th className="py-3 px-4 font-medium">Số điện thoại</th>
                <th className="py-3 px-6 font-medium text-right sm:text-center">Trạng thái / thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE4D9]">
              {filteredBranches.map((branch) => {
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
                      <div className="font-bold text-[#2C241E]">{branch.name}</div>
                      <div className="text-[11px] text-[#8C7A6B] mt-0.5">{branch.address}</div>
                    </td>

                    {/* Open Hours */}
                    <td className="py-3.5 px-4 font-semibold text-[#2C241E] whitespace-nowrap">
                      {branch.openingTime.slice(0, 5)}–{branch.closingTime.slice(0, 5)}
                    </td>

                    {/* Amenities / Services */}
                    <td className="py-3.5 px-4">
                      {branch.amenities.map((a, aIdx) => (
                        <div key={aIdx} className="text-xs text-[#2C241E] leading-relaxed">
                          • {a}
                        </div>
                      ))}
                    </td>

                    {/* Resources */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#2C241E]">{branch.phone}</div>
                      <div className="text-[11px] text-[#8C7A6B] mt-0.5">{branch.district}, {branch.city}</div>
                    </td>

                    {/* Status & Action */}
                    <td className="py-3.5 px-6 text-right sm:text-center">
                      <div className="flex flex-col items-end sm:items-center justify-center gap-1.5">
                        <span className="inline-block px-3 py-1 rounded-lg text-[11px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                          {branch.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectBranch(branch.id);
                            toast.info('Chi tiết chi nhánh', `Đang xem thông tin & sơ đồ phòng của ${branch.name}.`);
                          }}
                          className="text-xs font-bold text-[#8A4F23] hover:underline cursor-pointer"
                        >
                          Quản lý cơ sở
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
              <div>
                <h3 className="text-sm font-bold text-[#2C241E]">
                  Cơ sở đang chọn · {selectedBranch.district}
                </h3>
                <div className="mt-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3E2CE] text-[#8A4F23]">
                    {selectedBranch.name}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#2C241E] mt-2">
                  {selectedBranch.address}
                </div>
                <div className="text-[11px] text-[#8C7A6B] mt-0.5">
                  Hotline: {selectedBranch.phone} • Giờ hoạt động: {selectedBranch.openingTime.slice(0, 5)} - {selectedBranch.closingTime.slice(0, 5)}
                </div>
              </div>

              {/* Specifications Key-Value 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2 text-xs pt-1">
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
                    {selectedBranch.openingTime.slice(0, 5)}–{selectedBranch.closingTime.slice(0, 5)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#695A4E]">Danh sách phòng</span>
                  <span className="font-semibold text-[#2C241E]">
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
            <h3 className="text-sm font-bold text-[#2C241E]">Phân bổ phòng ốc cơ sở</h3>
            <div className="space-y-2">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#2C241E]">{r.name}</div>
                    <div className="text-[10px] text-[#8C7A6B]">{r.roomType} • {r.bedCapacity} giường</div>
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
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Modal Thêm Chi Nhánh Mới */}
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
                    <h2 className="text-lg font-extrabold text-[#3E200C]">Thêm cơ sở chi nhánh mới</h2>
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
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
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
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Tỉnh / Thành phố <span className="text-[#985018]">*</span>
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs font-semibold text-[#2C241E] focus:outline-none focus:border-[#985018] cursor-pointer"
                    >
                      {cityOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Quận / Huyện <span className="text-[#985018]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="districts-list"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="Ví dụ: Gò Vấp"
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                    />
                    <datalist id="districts-list">
                      {districtPresets.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Địa chỉ chi tiết <span className="text-[#985018]">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Ví dụ: 456 Phan Văn Trị, Phường 7"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                      />
                    </div>
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
                      onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2C241E] mb-1.5">
                      Giờ đóng cửa
                    </label>
                    <input
                      type="time"
                      value={formData.closingTime}
                      onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
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
                      className="w-full px-3 py-2.5 bg-white border border-[#E8DFD8] rounded-xl text-xs text-[#2C241E] placeholder:text-[#A8988C] focus:outline-none focus:border-[#985018] focus:ring-1 focus:ring-[#985018]"
                    />
                  </div>

                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EFE4D9] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#3E200C]">
                      <DoorOpen className="w-4 h-4 text-[#8A4F23]" />
                      <span>Tự động thiết lập 3 phòng trị liệu tiêu chuẩn ban đầu:</span>
                    </div>
                    <ul className="text-[11px] text-[#73675F] space-y-1 pl-5 list-disc">
                      <li><strong>Phòng VIP Hoàng Gia</strong>: 2 giường trị liệu cao cấp</li>
                      <li><strong>Phòng Trị Liệu Vodder 01</strong>: 4 giường massage bạch huyết</li>
                      <li><strong>Phòng Skincare Hydrafacial</strong>: 3 giường chăm sóc chuyên sâu</li>
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

