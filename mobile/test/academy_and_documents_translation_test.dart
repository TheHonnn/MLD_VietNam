import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/localization/app_translation.dart';

void main() {
  group('100% Translation for Academy Courses & Medical Documents Verification', () {
    test('All 11 Academy Course Titles translate to English', () {
      final courses = [
        'Chương trình phát triển giảng viên và học thuật',
        'Dẫn lưu bạch huyết chuyên sâu cho người làm nghề',
        'Dẫn lưu bạch huyết cơ bản cho người làm nghề',
        'Dẫn lưu bạch huyết nâng cao cho người làm nghề',
        'Dẫn lưu bạch huyết nền tảng cho người mới bắt đầu',
        'Giảm phù bằng dẫn lưu bạch huyết và băng ép CDT',
        'Hướng dẫn xây dựng chế độ ăn phòng ngừa bệnh lý tuyến vú',
        'Khoá học Chuyên đề Chăm sóc mẹ sau sinh',
        'Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú',
        'Lymphatic Wellness Signature Program',
        'Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật tuyến vú',
      ];

      for (final c in courses) {
        final en = AppTranslation.translate(c, isEn: true);
        expect(en, isNotEmpty, reason: 'Course $c should translate');
        expect(en != c || c.contains('Signature Program'), isTrue, reason: 'Course $c should translate to English');
      }
    });

    test('Chapters and Lessons translate dynamically and accurately', () {
      expect(
        AppTranslation.translate('Chương 1: Kiến thức nền tảng & Giải phẫu hệ bạch huyết', isEn: true),
        'Chapter 1: Foundations & Lymphatic System Anatomy',
      );
      expect(
        AppTranslation.translate('Chương 2: Thực hành lâm sàng & Phác đồ trị liệu', isEn: true),
        'Chapter 2: Clinical Practice & Therapy Protocols',
      );
      expect(
        AppTranslation.translate('Bài 1: Nhận biết sớm dấu hiệu phù - chủ động giảm nguy cơ phù tay sau phẫu thuật', isEn: true),
        contains('Early Detection of Edema'),
      );
      expect(
        AppTranslation.translate('Bài 2: Giải phẫu hệ bạch huyết', isEn: true),
        'Lesson 2: Lymphatic System Anatomy',
      );
    });

    test('Quizzes, Questions, Options, and Explanations translate to English', () {
      expect(
        AppTranslation.translate('Bài kiểm tra đánh giá: Khóa học Hướng dẫn phòng ngừa phù tay sau phẫu thuật ung thư vú', isEn: true),
        contains('Evaluation Assessment:'),
      );
      expect(
        AppTranslation.translate('Áp lực lực ấn tiêu chuẩn trong kỹ thuật Dẫn lưu bạch huyết MLD Vodder là bao nhiêu?', isEn: true),
        'What is the standard applied pressure in Vodder Manual Lymphatic Drainage (MLD)?',
      );
      expect(
        AppTranslation.translate('30 - 40 mmHg (tương đương sức nặng đồng xu nhẹ)', isEn: true),
        '30 - 40 mmHg (equivalent to the weight of a coin)',
      );
      expect(
        AppTranslation.translate('Hố thượng đòn (Terminus / Supraclavicular fossa)', isEn: true),
        'Supraclavicular fossa (Terminus)',
      );
      expect(
        AppTranslation.translate('Terminus tại hõm xương đòn là nơi ống ngực và ống bạch huyết phải đổ về tuần hoàn tĩnh mạch, luôn phải được mở thông trước tiên.', isEn: true),
        contains('The Terminus at the supraclavicular fossa'),
      );
    });

    test('Medical Guidelines and Shared Content translate to English', () {
      expect(
        AppTranslation.translate('Dẫn lưu bạch huyết có hỗ trợ giảm đau mỏi xương khớp không?', isEn: true),
        'Does Manual Lymphatic Drainage Help Relieve Joint and Muscle Pain?',
      );
      expect(
        AppTranslation.translate('Hiệu quả của Dẫn lưu bạch huyết bằng tay (MLD) trong hỗ trợ điều trị phù nề sau phẫu thuật', isEn: true),
        'Efficacy of Manual Lymphatic Drainage (MLD) in Post-Surgery Edema Relief',
      );
      expect(
        AppTranslation.translate('Phác đồ kỹ thuật dẫn lưu bạch huyết chuyên sâu theo phương pháp Vodder chuẩn hóa', isEn: true),
        'Standardized Vodder Method Intensive Lymphatic Drainage Protocol',
      );
      expect(
        AppTranslation.translate('Thoát vị đĩa đệm: dẫn lưu bạch huyết có thể hỗ trợ ở đâu?', isEn: true),
        'Herniated Disc: Where Can Manual Lymphatic Drainage Help?',
      );
      expect(
        AppTranslation.translate('Tại sao dẫn lưu bạch huyết thủ công lại không gây đau?', isEn: true),
        'Why is Manual Lymphatic Drainage Pain-Free?',
      );
      expect(
        AppTranslation.translate('Phù bạch huyết & MLD', isEn: true),
        'Lymphedema & MLD',
      );
    });

    test('Certificates & Enrollment Form details translate to English', () {
      expect(AppTranslation.translate('Kết quả học tập', isEn: true), 'Learning Results');
      expect(AppTranslation.translate('Giấy chứng nhận tốt nghiệp', isEn: true), 'Graduation Certificate');
      expect(AppTranslation.translate('HỌC VIỆN MLD VIỆT NAM', isEn: true), 'MLD VIETNAM ACADEMY');
      expect(AppTranslation.translate('GIẤY CHỨNG NHẬN ĐÀO TẠO NGHỀ', isEn: true), 'VOCATIONAL TRAINING CERTIFICATE');
      expect(AppTranslation.translate('Đăng ký khóa học', isEn: true), 'Enroll in Course');
      expect(AppTranslation.translate('Học phí trọn gói:', isEn: true), 'Comprehensive Tuition:');
      expect(AppTranslation.translate('Người mới bắt đầu', isEn: true), 'Beginners');
      expect(AppTranslation.translate('Đang làm nghề', isEn: true), 'Professional / Practitioner');
    });
  });
}

