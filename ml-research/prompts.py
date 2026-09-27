"""Câu mô tả (prompt) cho phân loại zero-shot bằng MobileCLIP.

CLIP học từ cặp ảnh–chú thích tiếng Anh, nên mô tả bằng tiếng Anh. Mỗi nhóm rác
có nhiều câu (prompt ensembling, theo Radford et al. 2021): ảnh được so với
từng câu, điểm của nhóm = tổng xác suất các câu thuộc nhóm đó.
"""

TEMPLATES = [
    "a photo of {}.",
    "a photo of {} in a trash bin.",
    "a close-up photo of {}.",
]

# Đối tượng tiêu biểu của từng nhóm theo hướng dẫn phân loại rác tại nguồn
# (hữu cơ / vô cơ / tái chế). Nhóm vô cơ thêm quần áo, giày dép, đồ nhựa dùng
# một lần vì đây là phần lớn rác vô cơ trong RealWaste (chỉnh trên tập val).
CLASS_OBJECTS = {
    "huu_co": [
        "food waste", "food scraps", "leftover food", "fruit peels", "a banana peel",
        "vegetable scraps", "rotten fruit", "eggshells", "coffee grounds",
        "leaves and grass clippings", "garden waste", "plant trimmings",
        "used tea bags", "food leftovers on a plate",
    ],
    "tai_che": [
        "a plastic bottle", "an aluminum can", "a tin can", "a glass bottle", "a glass jar",
        "cardboard", "a cardboard box", "newspaper", "office paper", "a paper bag",
        "scrap metal", "a clean plastic container", "a milk carton",
        "a paper cup", "a magazine", "a detergent bottle", "an aerosol can",
    ],
    "vo_co": [
        "general trash", "a dirty plastic bag", "a plastic shopping bag", "a black trash bag",
        "a styrofoam cup", "a styrofoam food box", "disposable plastic cutlery",
        "plastic straws", "a plastic cup lid", "a used tissue", "a disposable face mask",
        "cigarette butts", "candy wrappers", "old clothes", "a pile of used clothing",
        "old shoes", "a worn-out sneaker", "broken ceramics", "mixed landfill rubbish",
    ],
}

CLASS_ORDER = ["huu_co", "vo_co", "tai_che"]  # trùng WASTE_TYPES trong app


def all_prompts():
    """Danh sách (nhóm, câu) theo thứ tự cố định."""
    out = []
    for cls in CLASS_ORDER:
        for obj in CLASS_OBJECTS[cls]:
            for t in TEMPLATES:
                out.append((cls, t.format(obj)))
    return out
