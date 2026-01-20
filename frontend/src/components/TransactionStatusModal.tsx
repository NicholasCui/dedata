'use client'

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
} from '@heroui/react'
import {
  CheckCircle,
  XCircle,
  CircleNotchIcon,
  ArrowSquareOut,
} from '@phosphor-icons/react'

interface TransactionStatusModalProps {
  isOpen: boolean
  onClose: () => void
  status: 'pending' | 'success' | 'error'
  txHash?: string
  errorMessage?: string
}

export function TransactionStatusModal({
  isOpen,
  onClose,
  status,
  txHash,
  errorMessage,
}: TransactionStatusModalProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: CircleNotchIcon,
          iconClass: 'text-yellow-500 animate-spin',
          title: 'Transaction Pending',
          message: 'Please wait while your transaction is being processed...',
          bgClass: 'bg-yellow-500/10',
          borderClass: 'border-yellow-500/30',
        }
      case 'success':
        return {
          icon: CheckCircle,
          iconClass: 'text-green-500',
          title: 'Transaction Successful',
          message: 'Your swap has been completed successfully!',
          bgClass: 'bg-green-500/10',
          borderClass: 'border-green-500/30',
        }
      case 'error':
        return {
          icon: XCircle,
          iconClass: 'text-red-500',
          title: 'Transaction Failed',
          message: errorMessage || 'Your transaction failed. Please try again.',
          bgClass: 'bg-red-500/10',
          borderClass: 'border-red-500/30',
        }
    }
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon

  const handleViewOnPolygonscan = () => {
    if (txHash) {
      window.open(`https://polygonscan.com/tx/${txHash}`, '_blank')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      placement="center"
      backdrop="blur"
      isDismissable={status !== 'pending'}
      hideCloseButton={status === 'pending'}
      classNames={{
        wrapper: 'z-9999',
        backdrop: 'bg-black/80 backdrop-blur-sm',
        base: 'bg-black border border-green-500/30 rounded-lg max-w-md mx-auto',
        header: 'pt-5 pb-3',
        body: 'py-4',
        closeButton:
          'hover:bg-red-500/10 active:bg-red-500/20 text-red-500 top-4 right-4',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-green-500 font-mono">
            &gt; TRANSACTION_STATUS
          </h3>
        </ModalHeader>

        <ModalBody>
          <div
            className={`p-6 ${config.bgClass} border ${config.borderClass} rounded`}
          >
            <div className="flex flex-col items-center gap-4">
              <StatusIcon
                size={64}
                className={config.iconClass}
                weight="fill"
              />

              <div className="text-center">
                <h4 className="text-xl font-bold text-green-500 font-mono mb-2">
                  {config.title}
                </h4>
                <p className="text-sm text-green-400 font-mono">
                  {config.message}
                </p>
              </div>

              {status === 'success' && txHash && (
                <div className="w-full space-y-3 mt-2">
                  <div className="p-3 bg-black/50 border border-green-500/30 rounded">
                    <div className="text-xs text-green-400 font-mono mb-1">
                      Transaction Hash
                    </div>
                    <div className="text-xs text-green-500 font-mono break-all">
                      {txHash}
                    </div>
                  </div>

                  <Button
                    color="success"
                    radius="sm"
                    onPress={handleViewOnPolygonscan}
                    className="w-full bg-green-500 text-black font-mono"
                    endContent={<ArrowSquareOut size={18} />}
                  >
                    View on Polygonscan
                  </Button>
                </div>
              )}

              {status === 'error' && (
                <Button
                  color="default"
                  variant="bordered"
                  radius="sm"
                  onPress={onClose}
                  className="w-full border-green-500 text-green-500 font-mono mt-2"
                >
                  Close
                </Button>
              )}

              {status === 'success' && (
                <Button
                  color="default"
                  variant="bordered"
                  radius="sm"
                  onPress={onClose}
                  className="w-full border-green-500 text-green-500 font-mono"
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
