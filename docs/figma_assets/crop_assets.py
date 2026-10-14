import os
from PIL import Image

b06_img = Image.open('d:/VN_Champion/MLD_VietNam/figma_assets/individual_screens/B06_BranchDetail.png')
# Branch Hero
branch_hero = b06_img.crop((40, 556, 40 + 700, 556 + 400))
branch_hero.save('d:/VN_Champion/MLD_VietNam/mobile/assets/images/branch_hero_1.png')

# Branch Room
branch_room = b06_img.crop((40, 972, 40 + 342, 972 + 224))
branch_room.save('d:/VN_Champion/MLD_VietNam/mobile/assets/images/branch_room_1.png')

# Branch Reception
branch_reception = b06_img.crop((398, 972, 398 + 342, 972 + 224))
branch_reception.save('d:/VN_Champion/MLD_VietNam/mobile/assets/images/branch_reception_1.png')

# Specialist Profile
b08_img = Image.open('d:/VN_Champion/MLD_VietNam/figma_assets/individual_screens/B08_SpecialistProfile.png')
specialist_hero = b08_img.crop((40, 248, 40 + 700, 248 + 584))
specialist_hero.save('d:/VN_Champion/MLD_VietNam/mobile/assets/images/specialist_hero_1.png')

# Specialist 1 Avatar from B07
b07_img = Image.open('d:/VN_Champion/MLD_VietNam/figma_assets/individual_screens/B07_SpecialistListing.png')
# In B07, avatar card is at left: ~70, top: ~1510, size: ~180x180
# Let's crop it from B07_SpecialistListing.png
specialist_avatar_1 = b07_img.crop((72, 1512, 72 + 180, 1512 + 180))
specialist_avatar_1.save('d:/VN_Champion/MLD_VietNam/mobile/assets/images/specialist_avatar_1.png')

print("All branch and specialist images successfully cropped!")
