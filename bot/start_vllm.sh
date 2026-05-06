#!/bin/bash

# Script để chạy VLLM server với cấu hình phù hợp cho GTX 1650 (4GB VRAM)
# Model: Qwen/Qwen3.5-0.8B (model nhẹ, phù hợp với GPU nhỏ)

echo "🚀 Đang khởi động VLLM server..."
echo "📦 Model: Qwen/Qwen3.5-0.8B"
echo "🎮 GPU: NVIDIA GeForce GTX 1650 (4GB VRAM)"
echo "🌐 Host: 0.0.0.0:8001"
echo ""

cd "$(dirname "$0")"

# Tham số tối ưu cho GTX 1650 4GB:
# --dtype float16: Sử dụng FP16 để tiết kiệm VRAM
# --max-model-len 1024: Giới hạn context length để tiết kiệm memory
# --max-num-seqs 1: Chỉ xử lý 1 request cùng lúc
# --gpu-memory-utilization 0.85: Sử dụng 85% VRAM (để lại 15% cho hệ thống)
# --enforce-eager: Tắt CUDA graphs để tiết kiệm memory
# --disable-log-requests: Giảm log để tăng performance

uv run vllm serve Qwen/Qwen3.5-0.8B \
  --host 0.0.0.0 \
  --port 8001 \
  --dtype float16 \
  --max-model-len 1024 \
  --max-num-seqs 1 \
  --gpu-memory-utilization 0.85 \
  --enforce-eager

# Nếu gặp lỗi OOM (Out of Memory), thử giảm các tham số:
# --max-model-len 512
# --gpu-memory-utilization 0.75
