# Security and Encryption

> **Relevant source files**
> * [src/core/cff_parser.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/cff_parser.js)
> * [src/core/crypto.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/crypto.js)
> * [test/integration-boot.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration-boot.mjs)
> * [test/integration/text_layer_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/text_layer_spec.mjs)
> * [test/integration/viewer_spec.mjs](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/integration/viewer_spec.mjs)
> * [test/unit/cff_parser_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/cff_parser_spec.js)
> * [test/unit/crypto_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/crypto_spec.js)
> * [test/unit/evaluator_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/evaluator_spec.js)
> * [test/unit/function_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/function_spec.js)
> * [test/unit/murmurhash3_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/murmurhash3_spec.js)
> * [test/unit/network_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/network_spec.js)
> * [test/unit/stream_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/stream_spec.js)
> * [test/unit/testreporter.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/testreporter.js)
> * [test/unit/type1_parser_spec.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/test/unit/type1_parser_spec.js)

This document covers PDF.js's security and encryption systems, including cryptographic algorithm implementations, PDF security handlers, and encryption/decryption mechanisms. This system handles password-protected PDFs, implements various cipher algorithms, and manages security transformations during PDF processing.

For information about PDF content processing and parsing, see [Core PDF Processing Engine](/Mr-xzq/pdf.js-4.4.168/2-core-pdf-processing-engine).

## PDF Security Architecture

PDF.js implements a comprehensive security system that supports multiple encryption standards and security handlers. The system is built around cipher factories, security handlers, and cryptographic primitives.

```mermaid
flowchart TD

PDF17["PDF17 Security Handler"]
PDF20["PDF20 Security Handler"]
SecurityHandler["Base Security Handler"]
CipherTransformFactory["CipherTransformFactory"]
DecryptStream["DecryptStream"]
ARCFourCipher["ARCFourCipher"]
AES128Cipher["AES128Cipher"]
AES256Cipher["AES256Cipher"]
NullCipher["NullCipher"]
MD5["calculateMD5"]
SHA256["calculateSHA256"]
SHA384["calculateSHA384"]
SHA512["calculateSHA512"]
PDFDocument["PDF Document"]
StreamDecryption["Stream Decryption"]
StringDecryption["String Decryption"]

PDF17 --> CipherTransformFactory
PDF20 --> CipherTransformFactory
SecurityHandler --> CipherTransformFactory
CipherTransformFactory --> ARCFourCipher
CipherTransformFactory --> AES128Cipher
CipherTransformFactory --> AES256Cipher
CipherTransformFactory --> NullCipher
PDF17 --> MD5
PDF17 --> SHA256
PDF20 --> SHA256
PDF20 --> SHA384
PDF20 --> SHA512
DecryptStream --> StreamDecryption
CipherTransformFactory --> StringDecryption
PDFDocument --> SecurityHandler

subgraph subGraph4 ["PDF Document Processing"]
    PDFDocument
    StreamDecryption
    StringDecryption
    StreamDecryption --> PDFDocument
    StringDecryption --> PDFDocument
end

subgraph subGraph3 ["Cryptographic Primitives"]
    MD5
    SHA256
    SHA384
    SHA512
end

subgraph subGraph2 ["Cipher Implementations"]
    ARCFourCipher
    AES128Cipher
    AES256Cipher
    NullCipher
end

subgraph subGraph1 ["Cipher Factory"]
    CipherTransformFactory
    DecryptStream
    CipherTransformFactory --> DecryptStream
end

subgraph subGraph0 ["Security Handler Layer"]
    PDF17
    PDF20
    SecurityHandler
end
```

Sources: [src/core/crypto.js L1-L1754](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/crypto.js#L1-L1754)

 [src/core/decrypt_stream.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/decrypt_stream.js)

## Cryptographic Algorithm Implementations

PDF.js includes pure JavaScript implementations of standard cryptographic algorithms used in PDF encryption.

### Hash Functions

The system implements MD5 and SHA family hash functions for password verification and key derivation:

| Algorithm | Function | Usage |
| --- | --- | --- |
| MD5 | `calculateMD5` | Legacy PDF security, older encryption standards |
| SHA-256 | `calculateSHA256` | Modern PDF security, AES key derivation |
| SHA-384 | `calculateSHA384` | PDF 2.0 security features |
| SHA-512 | `calculateSHA512` | PDF 2.0 security, extended key derivation |

### Symmetric Encryption Ciphers

```mermaid
flowchart TD

AESBaseCipher["AESBaseCipher<br>(Abstract Base)"]
AES128Cipher["AES128Cipher<br>(128-bit key)"]
AES256Cipher["AES256Cipher<br>(256-bit key)"]
ARCFourCipher["ARCFourCipher<br>(RC4 Stream Cipher)"]
NullCipher["NullCipher<br>(No Encryption)"]
Encrypt["encrypt()"]
Decrypt["decryptBlock()"]
KeyExpansion["_expandKey()"]

AES128Cipher --> Encrypt
AES128Cipher --> Decrypt
AES128Cipher --> KeyExpansion
AES256Cipher --> Encrypt
AES256Cipher --> Decrypt
AES256Cipher --> KeyExpansion
ARCFourCipher --> Encrypt
ARCFourCipher --> Decrypt

subgraph subGraph1 ["Cipher Operations"]
    Encrypt
    Decrypt
    KeyExpansion
end

subgraph subGraph0 ["Cipher Hierarchy"]
    AESBaseCipher
    AES128Cipher
    AES256Cipher
    ARCFourCipher
    NullCipher
    AESBaseCipher --> AES128Cipher
    AESBaseCipher --> AES256Cipher
end
```

The `AESBaseCipher` class provides common AES functionality including S-boxes, MixColumns operations, and the core encryption/decryption rounds. The `ARCFourCipher` implements the RC4 stream cipher used in older PDF encryption standards.

Sources: [src/core/crypto.js L30-L1163](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/crypto.js#L30-L1163)

 [src/core/crypto.js L684-L1107](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/crypto.js#L684-L1107)

## Security Handlers

PDF.js implements different security handlers corresponding to PDF specification versions and encryption methods.

### PDF17 Security Handler

The `PDF17` class handles traditional PDF encryption (up to PDF 1.7):

```mermaid
flowchart TD

PDF17Class["PDF17"]
AuthenticateUser["authenticateUser()"]
CheckOwnerPassword["checkOwnerPassword()"]
CheckUserPassword["checkUserPassword()"]
GetDecryptKey["getDecryptKey()"]
RC4Encryption["RC4/AES128 Support"]
MD5KeyDerivation["MD5 Key Derivation"]
RevisionSupport["Revisions 2-4"]
PadPassword["padPassword()"]
PrepareKeyData["prepareKeyData()"]
PasswordBytes["stringToBytes()"]

CheckOwnerPassword --> PadPassword
CheckUserPassword --> PadPassword
AuthenticateUser --> PrepareKeyData

subgraph subGraph1 ["Password Processing"]
    PadPassword
    PrepareKeyData
    PasswordBytes
    PrepareKeyData --> PasswordBytes
end

subgraph subGraph0 ["PDF17 Security Handler"]
    PDF17Class
    AuthenticateUser
    CheckOwnerPassword
    CheckUserPassword
    GetDecryptKey
    RC4Encryption
    MD5KeyDerivation
    RevisionSupport
    PDF17Class --> AuthenticateUser
    PDF17Class --> CheckOwnerPassword
    PDF17Class --> CheckUserPassword
    PDF17Class --> GetDecryptKey
    AuthenticateUser --> RC4Encryption
    CheckOwnerPassword --> MD5KeyDerivation
    CheckUserPassword --> MD5KeyDerivation
    GetDecryptKey --> RevisionSupport
end
```

### PDF20 Security Handler

The `PDF20` class implements modern PDF 2.0 encryption with stronger algorithms:

```mermaid
flowchart TD

PDF20Class["PDF20"]
Hash["hash()"]
ProcessPassword["processPassword()"]
ComputeEncryptionKey["computeEncryptionKey()"]
AES256Support["AES-256 Encryption"]
SHA256KeyDerivation["SHA-256/384/512 Derivation"]
UnicodePasswords["Unicode Password Support"]
PBKDF2["PBKDF2-like iterations"]
SaltProcessing["Salt handling"]
UValue["U value computation"]
UEValue["UE value computation"]

Hash --> PBKDF2
ProcessPassword --> SaltProcessing
ComputeEncryptionKey --> UValue
ComputeEncryptionKey --> UEValue

subgraph subGraph1 ["Key Derivation Functions"]
    PBKDF2
    SaltProcessing
    UValue
    UEValue
end

subgraph subGraph0 ["PDF20 Security Handler"]
    PDF20Class
    Hash
    ProcessPassword
    ComputeEncryptionKey
    AES256Support
    SHA256KeyDerivation
    UnicodePasswords
    PDF20Class --> Hash
    PDF20Class --> ProcessPassword
    PDF20Class --> ComputeEncryptionKey
    Hash --> SHA256KeyDerivation
    ProcessPassword --> UnicodePasswords
    ComputeEncryptionKey --> AES256Support
end
```

Sources: [src/core/crypto.js L1164-L1754](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/crypto.js#L1164-L1754)

## Cipher Transform Factory

The `CipherTransformFactory` creates appropriate cipher instances based on PDF encryption dictionaries and handles the integration between security handlers and stream processing.

```mermaid
flowchart TD

EncryptDict["Encryption Dictionary"]
FileID["File ID"]
Password["User/Owner Password"]
CreateCipher["createCipherTransform()"]
SecurityHandlerSelection["Security Handler Selection"]
CipherInstantiation["Cipher Instantiation"]
CipherTransform["CipherTransform Object"]
DecryptFunction["decryptString()"]
EncryptFunction["encryptString()"]
StreamCipher["createStream()"]
PasswordException["PasswordException"]
PasswordResponses["PasswordResponses"]
InvalidCipher["Invalid Configuration"]

EncryptDict --> CreateCipher
FileID --> CreateCipher
Password --> CreateCipher
CipherInstantiation --> CipherTransform
CreateCipher --> PasswordException
SecurityHandlerSelection --> PasswordResponses
CipherInstantiation --> InvalidCipher

subgraph subGraph3 ["Error Handling"]
    PasswordException
    PasswordResponses
    InvalidCipher
end

subgraph subGraph2 ["Factory Output"]
    CipherTransform
    DecryptFunction
    EncryptFunction
    StreamCipher
    CipherTransform --> DecryptFunction
    CipherTransform --> EncryptFunction
    CipherTransform --> StreamCipher
end

subgraph CipherTransformFactory ["CipherTransformFactory"]
    CreateCipher
    SecurityHandlerSelection
    CipherInstantiation
    CreateCipher --> SecurityHandlerSelection
    SecurityHandlerSelection --> CipherInstantiation
end

subgraph subGraph0 ["Factory Input"]
    EncryptDict
    FileID
    Password
end
```

The factory pattern allows the PDF processing system to remain agnostic about specific encryption details while ensuring proper cipher selection and configuration.

Sources: [src/core/crypto.js L1164-L1754](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/crypto.js#L1164-L1754)

## Integration with PDF Processing

The security system integrates with PDF document processing through stream and string decryption mechanisms.

### Stream Decryption

Encrypted PDF streams are processed through the `DecryptStream` class, which wraps the underlying stream with appropriate cipher operations:

```mermaid
flowchart TD

EncryptedStream["Encrypted PDF Stream"]
DecryptStream["DecryptStream"]
CipherTransform["CipherTransform"]
DecryptedData["Decrypted Content"]
ContentStream["Content Streams"]
ImageStream["Image Streams"]
FontStream["Font Streams"]
XObjectStream["XObject Streams"]
BlockDecryption["Block-based Decryption"]
StreamDecryption["Stream Decryption"]
KeyScheduling["Key Scheduling"]

ContentStream --> EncryptedStream
ImageStream --> EncryptedStream
FontStream --> EncryptedStream
XObjectStream --> EncryptedStream
CipherTransform --> BlockDecryption
CipherTransform --> StreamDecryption
CipherTransform --> KeyScheduling

subgraph subGraph2 ["Cipher Operations"]
    BlockDecryption
    StreamDecryption
    KeyScheduling
end

subgraph subGraph1 ["Stream Types"]
    ContentStream
    ImageStream
    FontStream
    XObjectStream
end

subgraph subGraph0 ["Stream Processing Pipeline"]
    EncryptedStream
    DecryptStream
    CipherTransform
    DecryptedData
    EncryptedStream --> DecryptStream
    DecryptStream --> CipherTransform
    CipherTransform --> DecryptedData
end
```

### String Decryption

PDF string objects are decrypted directly through the cipher transform's `decryptString` method, handling both regular strings and hexadecimal string representations.

Sources: [src/core/decrypt_stream.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/decrypt_stream.js)

 [src/core/crypto.js L1164-L1754](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/crypto.js#L1164-L1754)

## Error Handling and Password Management

The security system provides comprehensive error handling for authentication failures and password management:

| Exception Type | Usage | Response Options |
| --- | --- | --- |
| `PasswordException` | Authentication failure | `NEED_PASSWORD`, `INCORRECT_PASSWORD` |
| `PasswordResponses` | Password prompt responses | User interaction handling |
| `FormatError` | Invalid encryption data | Graceful degradation |

The system supports both user and owner password authentication, with appropriate fallback mechanisms for different PDF security configurations.

Sources: [src/shared/util.js](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/shared/util.js)

 [src/core/crypto.js L1164-L1754](https://github.com/Mr-xzq/pdf.js-4.4.168/blob/19fbc899/src/core/crypto.js#L1164-L1754)