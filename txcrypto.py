import binascii
import gzip
import hashlib
import hmac
import json
import os
from typing import Union, Dict, Any
from Crypto.Cipher import AES


class FlutterCrypto:
    HMAC_KEY = b"928547a24cbf62a315d8cf0f46d67a17"

    def create_aes_key(self, uuid_str: str) -> bytes:
        """生成 AES 密钥"""
        uuid_clean = uuid_str.replace('-', '').lower()
        uuid_bytes = binascii.unhexlify(uuid_clean)
        return hmac.new(self.HMAC_KEY, uuid_bytes, hashlib.sha256).digest()

    def pkcs7_pad(self, data: bytes) -> bytes:
        pad_len = 16 - (len(data) % 16)
        return data + bytes([pad_len]) * pad_len

    def encrypt_data(self, data: bytes, uuid_str: str) -> bytes:
        """AES-CBC 加密并使用 PKCS7 填充"""
        aes_key = self.create_aes_key(uuid_str)
        iv = os.urandom(16)
        cipher = AES.new(aes_key, AES.MODE_CBC, iv)
        return iv + cipher.encrypt(self.pkcs7_pad(data))

    def decrypt_data(self, encrypted_data: bytes, uuid_str: str) -> bytes:
        """AES-CBC 解密并移除 PKCS7 填充"""
        aes_key = self.create_aes_key(uuid_str)
        iv = encrypted_data[:16]
        ciphertext = encrypted_data[16:]
        cipher = AES.new(aes_key, AES.MODE_CBC, iv)
        decrypted = cipher.decrypt(ciphertext)
        padding_length = decrypted[-1]
        return decrypted[:-padding_length]

    def compress_and_encrypt(self, data: Union[Dict[Any, Any], str, bytes], uuid_str: str) -> str:
        """序列化 -> Gzip 压缩 -> 加密 -> Hex 编码"""
        if isinstance(data, dict):
            data_bytes = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        elif isinstance(data, str):
            data_bytes = data.encode('utf-8')
        else:
            data_bytes = data
        compressed = gzip.compress(data_bytes)
        encrypted_data = self.encrypt_data(compressed, uuid_str)
        return binascii.hexlify(encrypted_data).decode('utf-8')

    def decrypt_and_decompress(self, encrypted_hex: str, uuid_str: str) -> Union[Dict[Any, Any], str, bytes]:
        """Hex 解码 -> 解密 -> Gzip 解压 -> 反序列化"""
        encrypted_data = binascii.unhexlify(encrypted_hex)
        decrypted_data = self.decrypt_data(encrypted_data, uuid_str)
        decompressed = gzip.decompress(decrypted_data)
        return json.loads(decompressed.decode('utf-8'))

