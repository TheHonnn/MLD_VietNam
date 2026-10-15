/// Comprehensive Form Validation Helpers for MLD Mobile App
/// Supports Vietnamese Phone Numbers, Email RFC standard, Vietnamese Full Name, CCCD, etc.
class AppValidators {
  AppValidators._();

  /// Vietnamese mobile phone regex: 10 digits starting with 03, 05, 07, 08, 09 or +84
  static final RegExp _vnPhoneRegex = RegExp(r'^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$');

  /// Standard RFC 5322 email regex
  static final RegExp _emailRegex = RegExp(
    r"^[a-zA-Z0-9.a-zA-Z0-9.!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9]+\.[a-zA-Z]+",
  );

  /// Vietnamese name regex: allows letters, spaces, and Vietnamese diacritics
  static final RegExp _vnNameRegex = RegExp(
    r"^[a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ\s]+$",
  );

  /// CCCD regex: 12 digits (or old CMND 9 digits)
  static final RegExp _cccdRegex = RegExp(r'^([0-9]{9}|[0-9]{12})$');

  /// Validate required non-empty string
  static String? required(String? value, [String message = 'Vui lòng không để trống thông tin']) {
    if (value == null || value.trim().isEmpty) {
      return message;
    }
    return null;
  }

  /// Validate Vietnamese phone number
  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Vui lòng nhập số điện thoại';
    }
    final cleanPhone = value.replaceAll(RegExp(r'[\s\.\-]'), '');
    if (!_vnPhoneRegex.hasMatch(cleanPhone)) {
      return 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09)';
    }
    return null;
  }

  /// Validate Email address
  static String? email(String? value, {bool isOptional = false}) {
    if (value == null || value.trim().isEmpty) {
      if (isOptional) return null;
      return 'Vui lòng nhập địa chỉ email';
    }
    final cleanEmail = value.trim();
    if (!_emailRegex.hasMatch(cleanEmail)) {
      return 'Địa chỉ email không hợp lệ (ví dụ: hotro@mldvietnam.vn)';
    }
    return null;
  }

  /// Validate Full Name (Họ và Tên)
  static String? fullName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Vui lòng nhập họ và tên';
    }
    final cleanName = value.trim();
    if (cleanName.length < 2) {
      return 'Họ và tên quá ngắn';
    }
    if (!_vnNameRegex.hasMatch(cleanName)) {
      return 'Họ và tên chỉ được chứa chữ cái, không chứa số hoặc ký tự đặc biệt';
    }
    final words = cleanName.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    if (words.length < 2) {
      return 'Vui lòng nhập đầy đủ cả họ và tên (ít nhất 2 từ)';
    }
    return null;
  }

  /// Validate Citizen ID (CCCD/CMND)
  static String? cccd(String? value, {bool isOptional = false}) {
    if (value == null || value.trim().isEmpty) {
      if (isOptional) return null;
      return 'Vui lòng nhập số CCCD/CMND';
    }
    final cleanId = value.replaceAll(RegExp(r'[\s\.\-]'), '');
    if (!_cccdRegex.hasMatch(cleanId)) {
      return 'Số CCCD không hợp lệ (gồm 9 hoặc 12 chữ số)';
    }
    return null;
  }

  /// Validate Note/Message length if provided
  static String? note(String? value, {int maxLength = 500}) {
    if (value == null || value.isEmpty) return null;
    if (value.length > maxLength) {
      return 'Ghi chú không được vượt quá $maxLength ký tự';
    }
    return null;
  }
}

