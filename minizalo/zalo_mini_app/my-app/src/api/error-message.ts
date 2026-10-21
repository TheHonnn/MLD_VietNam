const messages:Record<string,string>={
  'Quiz questions are not configured correctly':'Bài kiểm tra chưa sẵn sàng. Vui lòng liên hệ giảng viên; lượt thi chưa bị trừ.',
  'Quiz passing score is not configured correctly':'Điểm đạt của bài kiểm tra chưa hợp lệ. Vui lòng liên hệ giảng viên; lượt thi chưa bị trừ.',
  'Invalid profile image':'Ảnh đại diện cần là ảnh JPG, PNG, WebP hoặc đường dẫn HTTPS hợp lệ.',
  'Invalid date of birth':'Vui lòng nhập ngày sinh hợp lệ, không sau ngày hôm nay.',
  'A subject and message must be text':'Vui lòng nhập tiêu đề và nội dung bằng văn bản.',
  'A subject and message are required':'Vui lòng nhập tiêu đề tối đa 200 ký tự và nội dung tối đa 10.000 ký tự.',
  'Invalid pressure preference':'Vui lòng chọn mức lực massage.',
  'Invalid consultation details':'Vui lòng trả lời đầy đủ các câu hỏi về dị ứng và thể trạng.',
  'Request body is too large':'Nội dung gửi lên quá lớn. Vui lòng giảm dung lượng rồi thử lại.',
  'Request key was already used with different details':'Yêu cầu đã gửi trước đó có thông tin khác. Vui lòng kiểm tra lại.',
  'Course is unavailable':'Khóa học hiện không còn khả dụng. Vui lòng liên hệ học viện.',
  'Invalid emergency contact phone':'Số điện thoại liên hệ khẩn cấp không hợp lệ.',
  'Invalid emergencyContactPhone':'Số liên hệ khẩn cấp tối đa 20 ký tự.',
  'Invalid emergencyContactName':'Tên liên hệ khẩn cấp tối đa 150 ký tự.',
  'Invalid health profile':'Vui lòng kiểm tra lại thông tin sức khỏe.',
  'Preferred branch is unavailable':'Chi nhánh đã chọn không còn khả dụng. Vui lòng chọn lại.',
  'Voucher is unavailable':'Mã ưu đãi không còn hiệu lực. Hãy bỏ mã để tiếp tục hoặc chọn mã khác.',
  'Order does not meet voucher minimum':'Giá trị đơn chưa đạt điều kiện của mã ưu đãi.',
  'No shared technician slot is available':'Khung giờ này không còn phù hợp. Vui lòng chọn giờ hoặc chuyên viên khác.',
  'Technician has an overlapping booking':'Chuyên viên vừa có lịch trùng giờ. Vui lòng chọn lại khung giờ.',
  'Already registered for this course':'Bạn đã đăng ký khóa học này. Hãy kiểm tra trong Khóa học của tôi.',
  'Enrollment is required':'Bạn cần được ghi danh trước khi học hoặc làm bài kiểm tra.',
  'Enrollment is required to access course content':'Bạn cần được ghi danh để mở nội dung khóa học.',
  'Quiz has no questions':'Bài kiểm tra chưa sẵn sàng. Vui lòng liên hệ giảng viên.',
  'Quiz duration is not configured':'Bài kiểm tra chưa được cấu hình thời gian. Vui lòng liên hệ giảng viên.',
  'Attempt expired or already submitted':'Lượt thi đã hết hạn hoặc đã nộp. Vui lòng kiểm tra lịch sử bài làm.',
  'Video session expired or media changed':'Phiên video đã hết hạn hoặc nội dung đã thay đổi. Vui lòng mở lại bài học.',
  'Video duration or media is not configured':'Video chưa sẵn sàng. Vui lòng liên hệ giảng viên.',
  'Video heartbeat is too frequent':'Đang đồng bộ tiến độ video. Vui lòng thử lại sau ít giây.',
  'Use the shared refund workflow for a paid or started booking':'Lịch đã thanh toán hoặc bắt đầu thực hiện. Vui lòng liên hệ chi nhánh để xử lý.',
};
export function apiErrorMessage(message:unknown,status:number){
  if(typeof message==='string'){
    if(messages[message])return messages[message];
    if(/[À-ỹ]/.test(message))return message;
    if(message.includes('-501'))return 'Zalo từ chối xác minh do IP máy chủ ngoài Việt Nam. Vui lòng liên hệ hỗ trợ.';
    if(/relay|app secret|secret key/i.test(message))return 'Máy chủ xác minh chưa được cấu hình đúng. Vui lòng liên hệ hỗ trợ.';
  }
  if(status===401)return 'Vui lòng đăng nhập lại để tiếp tục.';
  if(status===403)return 'Bạn chưa có quyền thực hiện thao tác này.';
  if(status===404)return 'Nội dung không còn khả dụng.';
  if(status===409)return 'Dữ liệu đã thay đổi. Vui lòng kiểm tra lại trước khi tiếp tục.';
  if(status===429)return 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau ít giây.';
  if(status>=500)return 'Không thể xử lý lúc này. Vui lòng thử lại hoặc liên hệ hỗ trợ.';
  return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.';
}
