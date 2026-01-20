'use client'

import { useState, useEffect } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react'
import { PaperPlaneRight } from '@phosphor-icons/react'
import { useTokenTransfer } from '@/application/hooks/useTokenTransfer'
import { TOKENS } from '@/lib/blockchain/tokens'
import { TransactionStatusModal } from './TransactionStatusModal'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'success' | 'error'>(
    'pending'
  )
  const [statusErrorMessage, setStatusErrorMessage] = useState<string>('')

  const {
    transferAmount,
    setTransferAmount,
    recipientAddress,
    setRecipientAddress,
    balanceFormatted,
    isValidAddress,
    hasInsufficientBalance,
    executeTransfer,
    isTransferring,
    isConfirming,
    isConfirmed,
    txHash,
  } = useTokenTransfer({
    tokenAddress: TOKENS.DDATA.address as `0x${string}`,
    tokenDecimals: TOKENS.DDATA.decimals,
    tokenSymbol: TOKENS.DDATA.symbol,
  })

  const handleTransfer = async () => {
    try {
      // Close confirm modal and open status modal
      setShowConfirm(false)
      handleClose()
      setTransactionStatus('pending')
      setShowStatusModal(true)

      await executeTransfer()
      // Success will be handled by useEffect watching isConfirmed
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || ''
      if (
        errorMessage.includes('User denied') ||
        errorMessage.includes('User rejected') ||
        errorMessage.includes('rejected the request') ||
        errorMessage.includes('denied request signature') ||
        errorMessage.includes('User disapproved')
      ) {
        setTransactionStatus('error')
        setStatusErrorMessage('Transaction cancelled by user')
      } else {
        let cleanMessage = 'Transfer failed'
        if (errorMessage.includes('insufficient')) {
          cleanMessage = 'Insufficient balance'
        } else if (errorMessage.includes('invalid address')) {
          cleanMessage = 'Invalid recipient address'
        } else if (errorMessage) {
          const firstLine = errorMessage.split('\n')[0]
          if (firstLine.length < 100) {
            cleanMessage = firstLine
          }
        }
        setTransactionStatus('error')
        setStatusErrorMessage(cleanMessage)
      }
      console.error('Transfer error:', error)
    }
  }

  const handleClose = () => {
    setTransferAmount('')
    setRecipientAddress('')
    setShowConfirm(false)
    onClose()
  }

  const handleSetMax = () => {
    setTransferAmount(balanceFormatted)
  }

  const handleStatusModalClose = () => {
    setShowStatusModal(false)
    setStatusErrorMessage('')
  }

  useEffect(() => {
    if (isConfirmed && txHash) {
      setTransactionStatus('success')
    }
  }, [isConfirmed, txHash])

  const canProceed =
    recipientAddress &&
    transferAmount &&
    parseFloat(transferAmount) > 0 &&
    isValidAddress &&
    !hasInsufficientBalance

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="md"
        placement="center"
        backdrop="blur"
        classNames={{
          wrapper: 'z-9999',
          backdrop: 'bg-black/80 backdrop-blur-sm',
          base: 'bg-black border border-green-500/30 rounded-lg max-w-md mx-auto',
          header: 'pt-5 pb-3',
          body: 'py-4 max-h-[70vh] overflow-y-auto flex flex-col gap-0',
          footer: 'pt-4 pb-5',
          closeButton: 'hover:bg-red-500/10 active:bg-red-500/20 text-red-500 top-4 right-4',
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-green-500 font-mono">
              &gt; TRANSFER_DTOKEN
            </h3>
          </ModalHeader>

          <ModalBody>
            {showConfirm ? (
              <div className="space-y-4">
                <div className="p-4 bg-black/50 border border-green-500/30 rounded">
                  <div className="text-xs text-green-400 font-mono mb-2">Recipient</div>
                  <div className="text-sm font-mono text-green-500 break-all">
                    {recipientAddress}
                  </div>
                </div>

                <div className="p-4 bg-black/50 border border-green-500/30 rounded">
                  <div className="text-xs text-green-400 font-mono mb-2">Amount</div>
                  <div className="text-2xl font-bold text-green-500 font-mono">
                    {transferAmount} DDATA
                  </div>
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                  <p className="text-yellow-500 font-mono text-xs">
                    ⚠️ Please verify the recipient address carefully. Transfers cannot be
                    reversed.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Balance Display */}
                <div className="bg-black/50 border border-green-500/30 rounded p-3 mb-3">
                  <div className="text-xs text-green-400 font-mono mb-1">Your Balance</div>
                  <div className="text-xl font-bold text-green-500 font-mono">
                    {balanceFormatted} DDATA
                  </div>
                </div>

                {/* Recipient Address */}
                <div className="mb-3">
                  <div className="bg-black/50 border border-green-500/30 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-green-400 font-mono">Recipient Address</span>
                      {recipientAddress && !isValidAddress && (
                        <span className="text-xs text-red-500 font-mono">Invalid Address</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-transparent text-green-500 font-mono placeholder-green-400/50 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Amount */}
                <div className="mb-3">
                  <div className="bg-black/50 border border-green-500/30 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-green-400 font-mono">Amount</span>
                      <span className="text-xs text-green-400 font-mono">
                        Available: {balanceFormatted} DDATA
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="0.0"
                        className="flex-1 min-w-0 bg-transparent text-2xl font-bold text-green-500 font-mono placeholder-green-400/50 focus:outline-none"
                        step="any"
                      />
                      <button
                        onClick={handleSetMax}
                        className="px-2 py-1 hover:bg-green-500/30 text-green-500 rounded-sm font-mono text-xs transition-all whitespace-nowrap"
                      >
                        MAX
                      </button>
                      <div className="px-2 py-1.5 bg-green-500/20 rounded-sm font-mono text-sm text-green-500 shrink-0">
                        DDATA
                      </div>
                    </div>
                  </div>
                </div>

                {hasInsufficientBalance && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded mb-3">
                    <p className="text-red-500 font-mono text-xs">
                      Insufficient balance. Maximum: {balanceFormatted} DDATA
                    </p>
                  </div>
                )}
              </>
            )}
          </ModalBody>

          <ModalFooter className="gap-3">
            {showConfirm ? (
              <>
                <Button
                  color="default"
                  variant="bordered"
                  radius="sm"
                  onPress={() => setShowConfirm(false)}
                  className="border-green-500 text-green-500 font-mono"
                >
                  Back
                </Button>
                <Button
                  color="success"
                  radius="sm"
                  onPress={handleTransfer}
                  isDisabled={isTransferring || isConfirming}
                  className="bg-green-500 text-black font-mono"
                >
                  {isTransferring || isConfirming ? 'Processing...' : 'Confirm Transfer'}
                </Button>
              </>
            ) : (
              <Button
                color="success"
                radius="sm"
                onPress={() => setShowConfirm(true)}
                isDisabled={!canProceed}
                className="w-full bg-green-500 text-black font-mono"
                endContent={canProceed ? <PaperPlaneRight size={18} /> : undefined}
              >
                {!recipientAddress
                  ? 'Enter Recipient Address'
                  : !isValidAddress
                  ? 'Invalid Address'
                  : !transferAmount || parseFloat(transferAmount) <= 0
                  ? 'Enter Amount'
                  : hasInsufficientBalance
                  ? 'Insufficient Balance'
                  : 'Review Transfer'}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <TransactionStatusModal
        isOpen={showStatusModal}
        onClose={handleStatusModalClose}
        status={transactionStatus}
        txHash={txHash || ''}
        errorMessage={statusErrorMessage}
      />
    </>
  )
}
