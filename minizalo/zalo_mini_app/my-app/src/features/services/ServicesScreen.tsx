import React, { useMemo, useState } from 'react';
import type { MedicalService, Branch, Doctor } from '../../../../../backend/src/data/database';
import { EntityImage } from '@/components/GroupBExtensions';
import { DualFilterBar, type DualFilterSide } from '@/components/DualFilterBar';
import { serviceSearchText, searchText } from '@/utils/catalog';

export function ServicesScreen({
  services,
  branches,
  doctors,
  onBranch,
  onSelect,
  onBook,
  onAppointments,
  onPricing,
  onProducts,
  initialFilter,
}: {
  services: MedicalService[];
  branches: Branch[];
  doctors: Doctor[];
  activeBranchId: string;
  onBranch: (id: string) => void;
  onSelect: (service: MedicalService) => void;
  onBook: (service: MedicalService) => void;
  onSearch: () => void;
  onAppointments: () => void;
  onBranches: () => void;
  onPricing?: () => void;
  onProducts?: () => void;
  initialFilter?: { branchId: string; serviceId: string };
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [branch, setBranch] = useState(initialFilter?.branchId || '');
  const [selectedService] = useState(initialFilter?.serviceId || '');
  const [expandedSide, setExpandedSide] = useState<DualFilterSide | null>(null);

  const categories = [...new Set(services.map((s) => s.category).filter(Boolean))];

  const visible = useMemo(
    () =>
      services.filter(
        (s) =>
          (!selectedService || s.id === selectedService) &&
          (!category || s.category === category) &&
          (!branch || doctors.some((d) => d.branchId === branch && d.serviceIds?.includes(s.id))) &&
          serviceSearchText(s).includes(searchText(query)),
      ),
    [services, doctors, query, category, branch, selectedService],
  );

  const selectedBranchName = branches.find((b) => b.id === branch)?.name || 'Cơ sở';

  return (
    <section className="mobile-body services-screen-matched">
      <div className="mobile-section-heading">
        <h1>Dịch vụ & Sản phẩm</h1>
        <button type="button" onClick={onAppointments}>
          Lịch hẹn của tôi
        </button>
      </div>

      <div className="matched-segmented-tabs" role="tablist" aria-label="Danh mục dịch vụ và sản phẩm">
        <button type="button" role="tab" aria-selected="true">
          TRỊ LIỆU ({services.length})
        </button>
        {onProducts && (
          <button type="button" role="tab" aria-selected="false" onClick={onProducts}>
            SẢN PHẨM
          </button>
        )}
      </div>

      <input
        type="search"
        className="mobile-search"
        aria-label="Tìm kiếm dịch vụ, gói liệu trình"
        placeholder="Tìm kiếm dịch vụ, gói liệu trình..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <DualFilterBar
        leftLabel={category || 'Dịch vụ & Gói'}
        rightLabel={selectedBranchName}
        isLeftSelected={Boolean(category)}
        isRightSelected={Boolean(branch)}
        expandedSide={expandedSide}
        leftPanelTitle="Loại dịch vụ & Gói"
        rightPanelTitle="Cơ sở áp dụng"
        leftOptions={[
          { value: '', label: 'Tất cả dịch vụ' },
          ...categories.map((c) => ({ value: c, label: c })),
        ]}
        rightOptions={[
          { value: '', label: 'Tất cả cơ sở' },
          ...branches.map((b) => ({ value: b.id, label: b.name })),
        ]}
        selectedLeftValue={category}
        selectedRightValue={branch}
        onToggleLeft={() => setExpandedSide((s) => (s === 'left' ? null : 'left'))}
        onToggleRight={() => setExpandedSide((s) => (s === 'right' ? null : 'right'))}
        onSelectLeft={(val) => {
          setCategory(val);
          setExpandedSide(null);
        }}
        onSelectRight={(val) => {
          setBranch(val);
          if (val) onBranch(val);
          setExpandedSide(null);
        }}
      />

      {onPricing && (
        <nav className="service-catalog-links" aria-label="Bảng giá">
          <button type="button" onClick={onPricing}>
            Bảng giá & gói liệu trình
          </button>
        </nav>
      )}

      <div className="matched-service-grid">
        {visible.map((service) => (
          <article key={service.id} className="matched-service-card">
            <button type="button" className="matched-service-thumb" onClick={() => onSelect(service)}>
              <EntityImage src={service.image} alt={service.title} />
              <span className="matched-service-badge">DỊCH VỤ LẺ</span>
            </button>
            <div className="matched-service-info">
              <h2>{service.title}</h2>
              <small>{service.durationMinutes} phút / ca</small>
              <strong>{service.price.toLocaleString('vi-VN')} đ</strong>
              <button type="button" className="matched-book-btn" onClick={() => onBook(service)}>
                Đặt lịch
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
