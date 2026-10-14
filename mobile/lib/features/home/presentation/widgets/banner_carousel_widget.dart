import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/models/home_models.dart';
import '../../../../core/widgets/smart_image.dart';

class BannerCarouselWidget extends StatefulWidget {
  final List<BannerPromoModel> banners;
  final ValueChanged<BannerPromoModel>? onBannerTap;

  const BannerCarouselWidget({
    super.key,
    required this.banners,
    this.onBannerTap,
  });

  @override
  State<BannerCarouselWidget> createState() => _BannerCarouselWidgetState();
}

class _BannerCarouselWidgetState extends State<BannerCarouselWidget> {
  final PageController _pageController = PageController(viewportFraction: 0.92);
  int _currentPage = 0;

  @override
  Widget build(BuildContext context) {
    if (widget.banners.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        SizedBox(
          height: 170,
          child: PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentPage = index;
              });
            },
            itemCount: widget.banners.length,
            itemBuilder: (context, index) {
              final banner = widget.banners[index];
              return GestureDetector(
                onTap: () => widget.onBannerTap?.call(banner),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6.0),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      gradient: LinearGradient(
                        colors: index % 2 == 0
                            ? [
                                AppColors.primary,
                                const Color(0xFF6E350E),
                              ]
                            : [
                                const Color(0xFF8B4513),
                                const Color(0xFF4A2508),
                              ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.25),
                          blurRadius: 12,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        // Background banner image if available
                        if (banner.imageUrl.isNotEmpty)
                          Positioned(
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: 145,
                            child: ClipRRect(
                              borderRadius: const BorderRadius.only(
                                topRight: Radius.circular(20),
                                bottomRight: Radius.circular(20),
                              ),
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  SmartImage(
                                    imageUrl: banner.imageUrl,
                                    fit: BoxFit.cover,
                                  ),
                                  Container(
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          (index % 2 == 0
                                                  ? AppColors.primary
                                                  : const Color(0xFF8B4513))
                                              .withValues(alpha: 0.95),
                                          Colors.transparent,
                                        ],
                                        begin: Alignment.centerLeft,
                                        end: Alignment.centerRight,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        // Background decoration circles
                        Positioned(
                          right: -20,
                          bottom: -20,
                          child: Container(
                            width: 140,
                            height: 140,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.08),
                            ),
                          ),
                        ),
                        Positioned(
                          right: 40,
                          top: -30,
                          child: Container(
                            width: 90,
                            height: 90,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.05),
                            ),
                          ),
                        ),
                        // Content
                        Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: SizedBox(
                            width: MediaQuery.of(context).size.width * 0.55,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  banner.tag,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    banner.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    banner.subtitle,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w400,
                                      color: Colors.white.withValues(alpha: 0.88),
                                    ),
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          banner.ctaText,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        const Icon(
                                          Icons.arrow_forward_rounded,
                                          size: 14,
                                          color: AppColors.primary,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 10),
        // Indicators
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            widget.banners.length,
            (index) => AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: _currentPage == index ? 20 : 6,
              height: 6,
              decoration: BoxDecoration(
                color: _currentPage == index
                    ? AppColors.primary
                    : AppColors.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

