from PIL import Image

b07_img = Image.open('d:/VN_Champion/MLD_VietNam/figma_assets/individual_screens/B07_SpecialistListing.png')

# Specialist 1 Avatar (Nguyễn Thu Hà)
sp1 = b07_img.crop((72, 1272, 72 + 176, 1272 + 208))
sp1.save('d:/VN_Champion/MLD_VietNam/mobile/assets/images/specialist_avatar_1.png')

# Specialist 2 Avatar (Trần Minh Phương)
sp2 = b07_img.crop((72, 1772, 72 + 176, 1772 + 208))
sp2.save('d:/VN_Champion/MLD_VietNam/mobile/assets/images/specialist_avatar_2.png')

# Specialist 3 Avatar
sp3 = b07_img.crop((72, 2272, 72 + 176, 2272 + 208))
sp3.save('d:/VN_Champion/MLD_VietNam/mobile/assets/images/specialist_avatar_3.png')

print("All specialist avatars cropped successfully!")

