// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * EscrowManager — production-ready
 * - Supports ETH and ERC20.
 * - Emits ledger-friendly events for bridging.
 * - Uses AccessControl: DEFAULT_ADMIN_ROLE is backend/admin (deployer).
 */
contract EscrowManager is ReentrancyGuard, Pausable, AccessControl {
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    enum Status { CREATED, FUNDED, RELEASED, REFUNDED }

    struct Payment {
        address payer;
        address payee;
        address token;   // address(0) => ETH
        uint256 amount;
        Status status;
        bool hold;
    }

    mapping(bytes32 => Payment) public payments;

    event PaymentCreated(bytes32 indexed paymentId, address indexed payer, address indexed payee, address token, uint256 amount);
    event PaymentFunded(bytes32 indexed paymentId, address indexed from, uint256 amount, address token);
    event PaymentReleased(bytes32 indexed paymentId, address indexed to, uint256 amount, address token);
    event PaymentRefunded(bytes32 indexed paymentId, address indexed to, uint256 amount, address token);
    event PaymentHoldSet(bytes32 indexed paymentId, bool hold);

    // Ledger/bridge friendly events (include optional reason)
    event FundsReleased(bytes32 indexed paymentId, address indexed to, uint256 amount, string reason);
    event FundsRefunded(bytes32 indexed paymentId, address indexed to, uint256 amount, string reason);

    // ERC20/stablecoin-specific events (clear naming)
    event StablecoinDeposited(bytes32 indexed paymentId, address token, address payer, uint256 amount);
    event StablecoinReleased(bytes32 indexed paymentId, address token, address to, uint256 amount);
    event StablecoinRefunded(bytes32 indexed paymentId, address token, address to, uint256 amount);

    constructor(address admin, address arbiter) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        if (arbiter != address(0)) {
            _grantRole(ARBITER_ROLE, arbiter);
        }
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }

    modifier onlyArbiterOrAdmin() {
        require(hasRole(ARBITER_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not arbiter/admin");
        _;
    }

    /**
     * createPayment
     * - Called by backend/admin to register an expected payment on-chain.
     * - paymentId: bytes32 identifier (e.g. sha256 hex of off-chain id)
     * - token: address(0) => ETH, otherwise ERC20 token contract address
     */
    function createPayment(bytes32 paymentId, address payer, address payee, address token, uint256 amount)
        external onlyAdmin whenNotPaused
    {
        require(payments[paymentId].payer == address(0), "Payment exists");
        require(payer != address(0) && payee != address(0), "Invalid addresses");
        require(amount > 0, "Invalid amount");

        payments[paymentId] = Payment({
            payer: payer,
            payee: payee,
            token: token,
            amount: amount,
            status: Status.CREATED,
            hold: false
        });

        emit PaymentCreated(paymentId, payer, payee, token, amount);
    }

    /**
     * depositETH
     * - Payer must call with exact value.
     */
    function depositETH(bytes32 paymentId) external payable nonReentrant whenNotPaused {
        Payment storage p = payments[paymentId];
        require(p.payer != address(0), "No payment");
        require(p.token == address(0), "Not ETH payment");
        require(msg.sender == p.payer, "Only payer");
        require(p.status == Status.CREATED, "Wrong status");
        require(msg.value == p.amount, "Amount mismatch");

        p.status = Status.FUNDED;
        emit PaymentFunded(paymentId, msg.sender, msg.value, address(0));
    }

    /**
     * depositERC20
     * - Payer must approve this contract for `p.amount` beforehand.
     */
    function depositERC20(bytes32 paymentId) external nonReentrant whenNotPaused {
        Payment storage p = payments[paymentId];
        require(p.payer != address(0), "No payment");
        require(p.token != address(0), "Not token payment");
        require(msg.sender == p.payer, "Only payer");
        require(p.status == Status.CREATED, "Wrong status");

        uint256 balBefore = IERC20(p.token).balanceOf(address(this));
        require(IERC20(p.token).transferFrom(msg.sender, address(this), p.amount), "Transfer failed");
        uint256 received = IERC20(p.token).balanceOf(address(this)) - balBefore;
        require(received == p.amount, "Amount mismatch");

        p.status = Status.FUNDED;
        emit PaymentFunded(paymentId, msg.sender, received, p.token);
        emit StablecoinDeposited(paymentId, p.token, msg.sender, received);
    }

    function setHold(bytes32 paymentId, bool hold_) external onlyArbiterOrAdmin {
        Payment storage p = payments[paymentId];
        require(p.payer != address(0), "No payment");
        p.hold = hold_;
        emit PaymentHoldSet(paymentId, hold_);
    }

    /**
     * release
     * - Admin only.
     * - Pays `payee` the escrowed funds.
     * - Emits both PaymentReleased + FundsReleased + StablecoinReleased when token used.
     */
    function release(bytes32 paymentId) external onlyAdmin nonReentrant whenNotPaused {
        Payment storage p = payments[paymentId];
        require(p.status == Status.FUNDED, "Not funded");
        require(!p.hold, "On hold");

        p.status = Status.RELEASED;

        if (p.token == address(0)) {
            (bool ok, ) = p.payee.call{value: p.amount}("");
            require(ok, "ETH transfer failed");

            emit PaymentReleased(paymentId, p.payee, p.amount, address(0));
            emit FundsReleased(paymentId, p.payee, p.amount, "");
        } else {
            require(IERC20(p.token).transfer(p.payee, p.amount), "ERC20 transfer failed");

            emit PaymentReleased(paymentId, p.payee, p.amount, p.token);
            emit StablecoinReleased(paymentId, p.token, p.payee, p.amount);
            emit FundsReleased(paymentId, p.payee, p.amount, "");
        }
    }

    /**
     * refund
     * - Admin only.
     * - Returns funds to payer.
     */
    function refund(bytes32 paymentId) external onlyAdmin nonReentrant whenNotPaused {
        Payment storage p = payments[paymentId];
        require(p.status == Status.FUNDED, "Not funded");
        require(!p.hold, "On hold");

        p.status = Status.REFUNDED;

        if (p.token == address(0)) {
            (bool ok, ) = p.payer.call{value: p.amount}("");
            require(ok, "ETH refund failed");

            emit PaymentRefunded(paymentId, p.payer, p.amount, address(0));
            emit FundsRefunded(paymentId, p.payer, p.amount, "");
        } else {
            require(IERC20(p.token).transfer(p.payer, p.amount), "ERC20 refund failed");

            emit PaymentRefunded(paymentId, p.payer, p.amount, p.token);
            emit StablecoinRefunded(paymentId, p.token, p.payer, p.amount);
            emit FundsRefunded(paymentId, p.payer, p.amount, "");
        }
    }

    function pause() external onlyAdmin { _pause(); }
    function unpause() external onlyAdmin { _unpause(); }

    function getPayment(bytes32 paymentId) external view returns (
        address payer, address payee, address token, uint256 amount, Status status, bool hold
    ) {
        Payment memory p = payments[paymentId];
        return (p.payer, p.payee, p.token, p.amount, p.status, p.hold);
    }

    /**
     * sweep
     * - Admin rescue function for tokens/ETH (do NOT touch active payments).
     */
    function sweep(address token, address to, uint256 amount) external onlyAdmin {
        require(to != address(0), "bad to");
        if (token == address(0)) {
            (bool ok, ) = to.call{value: amount}("");
            require(ok, "ETH sweep failed");
        } else {
            require(IERC20(token).transfer(to, amount), "ERC20 sweep failed");
        }
    }

    // allow receiving ETH directly (not used for deposits)
    receive() external payable {}
}
