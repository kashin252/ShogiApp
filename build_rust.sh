#!/bin/bash
set -e

echo "=== Building Rust Shogi Engine for Android ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUST_DIR="$SCRIPT_DIR/rust/shogi_engine"
JNILIBS_DIR="$SCRIPT_DIR/modules/shogi-engine/android/src/main/jniLibs"

# Build for all 3 Android targets
TARGETS=(
    "aarch64-linux-android:arm64-v8a"
    "armv7-linux-androideabi:armeabi-v7a"
    "x86_64-linux-android:x86_64"
)

cd "$RUST_DIR"

for target_pair in "${TARGETS[@]}"; do
    IFS=":" read -r rust_target abi <<< "$target_pair"
    echo ""
    echo "--- Building for $rust_target ($abi) ---"
    RUSTFLAGS="-C link-arg=-Wl,-z,max-page-size=16384" cargo build --release --target "$rust_target"
    
    # Copy .so to jniLibs (use absolute path to avoid mistakes)
    mkdir -p "$JNILIBS_DIR/$abi"
    cp "target/$rust_target/release/libshogi_engine.so" "$JNILIBS_DIR/$abi/"
    echo "Copied to $JNILIBS_DIR/$abi/libshogi_engine.so"
done

echo ""
echo "=== Build complete! ==="
ls -la "$JNILIBS_DIR"/*/libshogi_engine.so
