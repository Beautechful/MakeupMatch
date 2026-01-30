import type { BundleProduct as BundleProductType } from '~/features/bundle/types';
import { ProductAvailability } from '~/features/results/components/product-availability';

export const BundleProduct = ({
  product,
  customStyles,
}: {
  product: BundleProductType;
  customStyles?: React.CSSProperties;
}) => {
  const { image, brand, price, availability, description } = product;
  return (
    <div
      className="p-2 sm:p-3 shadow-md rounded-md sm:flex sm:flex-col bg-white  flex-shrink-0"
      style={customStyles}
    >
      <img
        src={image}
        alt={brand}
        className="object-contain sm:h-60 h-50 col-span-1 flex justify-center items-center w-full rounded-md p-1 bg-[#F2F2F2]"
      />
      <div className="flex flex-col text-left sm:py-4 py-2 sm:px-2 gap-3">
        <p className="text-sm sm:text-base font-medium sm:font-normal text-black line-clamp-">
          {`${brand} ${description}`}
        </p>
        <ProductAvailability
          availability={availability}
          price={price}
          size="small"
        />
      </div>
    </div>
  );
};
