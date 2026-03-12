import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-[fadeUp_0.25s_ease-out_both]">
      {/* Large Error Code */}
      <div className="text-[72px] font-extrabold font-[var(--ff-display)] text-[var(--text4)] leading-none">
        404
      </div>
      
      {/* Status Message */}
      <p className="text-[var(--text2)] text-base font-semibold">
        Page not found
      </p>
      
      {/* Subtext */}
      <p className="text-[var(--text3)] text-[13px]">
        The page you're looking for doesn't exist.
      </p>
      
      {/* CTA Button */}
      <button
        onClick={() => navigate('/')}
        className="mt-2 px-[22px] py-[9px] rounded-lg border-none bg-[var(--blue)] text-white text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90 active:scale-95"
      >
        Back to Markets
      </button>
    </div>
  )
}