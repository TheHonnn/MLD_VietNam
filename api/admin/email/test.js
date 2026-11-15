module.exports = function retiredEmailTest(req, res) {
  return res.status(410).json({
    success: false,
    message: 'Sử dụng API gửi thử email có xác thực của máy chủ quản trị.',
  });
};
